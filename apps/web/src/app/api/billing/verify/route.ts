import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { BILLING_PLANS } from "@/lib/billing-plans";

const billingDb = db as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw new Error("RAZORPAY_KEY_SECRET is missing");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return expectedSignature === input.signature;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id || !session.user.email) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();

    const razorpayOrderId = safeString(body.razorpay_order_id);
    const razorpayPaymentId = safeString(body.razorpay_payment_id);
    const razorpaySignature = safeString(body.razorpay_signature);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonError("Missing Razorpay payment verification fields");
    }

    const payment = await billingDb.billingPayment.findUnique
({
      where: {
        razorpayOrderId,
      },
    });

    if (!payment) {
      return jsonError("Billing payment record not found", 404);
    }

    if (payment.userId !== session.user.id) {
      return jsonError("This payment does not belong to current user", 403);
    }

    const validSignature = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!validSignature) {
      await billingDb.billingPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "SIGNATURE_FAILED",
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      return jsonError("Invalid Razorpay payment signature", 400);
    }

    const plan = BILLING_PLANS.PRO;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [updatedPayment, billing] = await db.$transaction([
      billingDb.billingPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "PAID",
          razorpayPaymentId,
          razorpaySignature,
        },
      }),
      billingDb.workspaceBilling.upsert({
        where: {
          workspaceId: payment.workspaceId,
        },
        create: {
          workspaceId: payment.workspaceId,
          plan: plan.id,
          status: "ACTIVE",
          razorpayPaymentId,
          razorpayOrderId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          aiReviewCredits: plan.aiReviewCredits,
          aiReviewUsed: 0,
          repositoryLimit: plan.repositoryLimit,
          projectLimit: plan.projectLimit,
          prdLimit: plan.prdLimit,
          premiumWorkflow: plan.premiumWorkflow,
        },
        update: {
          plan: plan.id,
          status: "ACTIVE",
          razorpayPaymentId,
          razorpayOrderId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          aiReviewCredits: plan.aiReviewCredits,
          repositoryLimit: plan.repositoryLimit,
          projectLimit: plan.projectLimit,
          prdLimit: plan.prdLimit,
          premiumWorkflow: plan.premiumWorkflow,
        },
      }),
    ]);

    await db.auditLog.create({
      data: {
        workspaceId: payment.workspaceId,
        actorId: session.user.id,
        action: "billing.plan.upgraded",
        entityType: "WorkspaceBilling",
        entityId: billing.id,
        metadata: JSON.stringify({
          planId: plan.id,
          paymentId: updatedPayment.id,
          razorpayOrderId,
          razorpayPaymentId,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          aiReviewCredits: plan.aiReviewCredits,
          repositoryLimit: plan.repositoryLimit,
          projectLimit: plan.projectLimit,
          prdLimit: plan.prdLimit,
          premiumWorkflow: plan.premiumWorkflow,
          upgradedByEmail: session.user.email,
          message:
            "Workspace upgraded to Loom Pro after verified Razorpay payment.",
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      billing,
      message: "Workspace upgraded to Pro",
    });
  } catch (error) {
    console.error("billing verify error", error);

    return jsonError(
      error instanceof Error ? error.message : "Failed to verify billing payment",
      500,
    );
  }
}