import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!membership) {
      return jsonError("Workspace membership not found", 404);
    }

    const billing = await billingDb.workspaceBilling.upsert({
      where: {
        workspaceId: membership.workspaceId,
      },
      create: {
        workspaceId: membership.workspaceId,
        plan: "FREE",
        status: "ACTIVE",
        aiReviewCredits: BILLING_PLANS.FREE.aiReviewCredits,
        repositoryLimit: BILLING_PLANS.FREE.repositoryLimit,
        projectLimit: BILLING_PLANS.FREE.projectLimit,
        prdLimit: BILLING_PLANS.FREE.prdLimit,
        premiumWorkflow: BILLING_PLANS.FREE.premiumWorkflow,
      },
      update: {},
    });

    return NextResponse.json({
      ok: true,
      billing,
      plans: BILLING_PLANS,
      isAdmin: String(membership.role) === "ADMIN",
    });
  } catch (error) {
    console.error("billing status error", error);

    return jsonError(
      error instanceof Error ? error.message : "Failed to load billing status",
      500,
    );
  }
}