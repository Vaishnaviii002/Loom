import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
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

async function createRazorpayOrder(input: {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are missing");
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.description || "Failed to create Razorpay order");
  }

  return data as {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  };
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
    const planId = safeString(body.planId);

    if (planId !== "PRO") {
      return jsonError("Only PRO checkout is supported right now");
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
        role: "ADMIN",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!membership) {
      return jsonError("Only workspace admin can upgrade billing", 403);
    }

    const plan = BILLING_PLANS.PRO;

    const order = await createRazorpayOrder({
      amount: plan.amount,
      currency: plan.currency,
      receipt: `loom_${membership.workspaceId}_${Date.now()}`.slice(0, 40),
      notes: {
        workspaceId: membership.workspaceId,
        userId: session.user.id,
        planId: plan.id,
        product: "Loom",
      },
    });

    const payment = await billingDb.billingPayment.create({
      data: {
        workspaceId: membership.workspaceId,
        userId: session.user.id,
        plan: plan.id,
        amount: plan.amount,
        currency: plan.currency,
        status: "ORDER_CREATED",
        razorpayOrderId: order.id,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: membership.workspaceId,
        actorId: session.user.id,
        action: "billing.checkout.created",
        entityType: "BillingPayment",
        entityId: payment.id,
        metadata: JSON.stringify({
          planId: plan.id,
          razorpayOrderId: order.id,
          amount: plan.amount,
          currency: plan.currency,
          createdByEmail: session.user.email,
          message: "Admin created a Razorpay checkout order for Loom Pro.",
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: {
        id: plan.id,
        name: plan.name,
      },
      customer: {
        name: session.user.name || "Loom Admin",
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error("billing checkout error", error);

    return jsonError(
      error instanceof Error ? error.message : "Failed to create billing checkout",
      500,
    );
  }
}