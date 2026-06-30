"use client";

import { useEffect, useMemo, useState } from "react";

type BillingPlan = {
  id: "FREE" | "PRO";
  name: string;
  priceLabel: string;
  amount: number;
  currency: string;
  aiReviewCredits: number;
  repositoryLimit: number;
  projectLimit: number;
  prdLimit: number;
  premiumWorkflow: boolean;
  features: string[];
};

type BillingStatus = {
  id: string;
  workspaceId: string;
  plan: "FREE" | "PRO";
  status: string;
  aiReviewCredits: number;
  aiReviewUsed: number;
  repositoryLimit: number;
  repositoryUsed: number;
  projectLimit: number;
  projectUsed: number;
  prdLimit: number;
  prdUsed: number;
  premiumWorkflow: boolean;
  currentPeriodEnd?: string | null;
};

type BillingStatusResponse = {
  ok: boolean;
  billing: BillingStatus;
  plans: {
    FREE: BillingPlan;
    PRO: BillingPlan;
  };
  isAdmin: boolean;
  error?: string;
};

type CheckoutResponse = {
  ok: boolean;
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan: {
    id: string;
    name: string;
  };
  customer: {
    name: string;
    email: string;
  };
  error?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

function formatLimit(value: number) {
  return value === -1 ? "Unlimited" : String(value);
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BillingPanel() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<BillingStatusResponse["plans"] | null>(
    null,
  );
  const [isAdmin, setIsAdmin] = useState(false);

  const currentPlan = billing?.plan || "FREE";

  const usageRows = useMemo(() => {
    if (!billing) return [];

    return [
      {
        label: "AI review credits",
        used: billing.aiReviewUsed,
        limit: billing.aiReviewCredits,
      },
      {
        label: "Repositories",
        used: billing.repositoryUsed,
        limit: billing.repositoryLimit,
      },
      {
        label: "Projects",
        used: billing.projectUsed,
        limit: billing.projectLimit,
      },
      {
        label: "PRDs",
        used: billing.prdUsed,
        limit: billing.prdLimit,
      },
    ];
  }, [billing]);

  async function loadBilling() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/billing/status", {
        cache: "no-store",
      });

      const data = (await response.json()) as BillingStatusResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load billing");
      }

      setBilling(data.billing);
      setPlans(data.plans);
      setIsAdmin(data.isAdmin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }

  async function upgradeToPro() {
    setError("");
    setCheckoutLoading(true);

    try {
      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay Checkout script");
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: "PRO",
        }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create Razorpay checkout");
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Loom",
        description: "Upgrade to Loom Pro",
        order_id: data.orderId,
        prefill: {
          name: data.customer.name,
          email: data.customer.email,
        },
        theme: {
          color: "#aa4825",
        },
        handler: async function (paymentResponse: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          const verifyResponse = await fetch("/api/billing/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(paymentResponse),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok || !verifyData.ok) {
            throw new Error(
              verifyData.error || "Payment completed but verification failed",
            );
          }

          await loadBilling();
        },
      });

      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
  }, []);

  return (
    <div className="min-h-full bg-[#111111] text-white">
      <div className="border-b border-white/10 px-10 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
          Billing
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Plans, credits, and usage limits
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
          Choose the right plan for your delivery workflow. Free teams can test
          one project, while Pro unlocks higher AI review credits, repository
          limits, and premium workflow features.
        </p>
      </div>

      <section className="px-10 py-10">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
            Loading billing...
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm leading-7 text-red-100">
            {error}
          </div>
        ) : null}

        {billing && plans ? (
          <>
            <div className="mb-8 grid gap-4 xl:grid-cols-4">
              {usageRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    {row.label}
                  </p>

                  <p className="mt-3 text-2xl font-semibold text-white">
                    {row.used} / {formatLimit(row.limit)}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-8 xl:grid-cols-2">
              <BillingPlanCard
                plan={plans.FREE}
                currentPlan={currentPlan}
                isAdmin={isAdmin}
                disabled
              />

              <BillingPlanCard
                plan={plans.PRO}
                currentPlan={currentPlan}
                isAdmin={isAdmin}
                onUpgrade={upgradeToPro}
                loading={checkoutLoading}
              />
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <p className="text-sm font-semibold text-white">
                Current workspace entitlement
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Entitlement label="Plan" value={billing.plan} />
                <Entitlement label="Status" value={billing.status} />
                <Entitlement
                  label="Premium workflow"
                  value={billing.premiumWorkflow ? "Enabled" : "Disabled"}
                />
              </div>

              {billing.currentPeriodEnd ? (
                <p className="mt-5 text-sm text-white/45">
                  Current period ends on{" "}
                  {new Date(billing.currentPeriodEnd).toLocaleDateString()}.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function BillingPlanCard({
  plan,
  currentPlan,
  isAdmin,
  disabled,
  onUpgrade,
  loading,
}: {
  plan: BillingPlan;
  currentPlan: "FREE" | "PRO";
  isAdmin: boolean;
  disabled?: boolean;
  onUpgrade?: () => void;
  loading?: boolean;
}) {
  const isCurrent = currentPlan === plan.id;
  const isPro = plan.id === "PRO";

  return (
    <article
      className={
        isPro
          ? "rounded-3xl border border-[#aa4825]/50 bg-[#aa4825]/10 p-8 shadow-2xl shadow-[#aa4825]/10"
          : "rounded-3xl border border-white/10 bg-white/[0.02] p-8"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#ff7a45]">{plan.name}</p>

          <div className="mt-6 flex items-end gap-2">
            <p className="text-5xl font-semibold tracking-tight text-white">
              {plan.priceLabel}
            </p>

            <p className="pb-2 text-sm text-white/40">/ month</p>
          </div>
        </div>

        {isCurrent ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            Current plan
          </span>
        ) : null}
      </div>

      <ul className="mt-8 space-y-4 text-sm leading-7 text-white/65">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span className="mt-2 h-2 w-2 rounded-full bg-[#aa4825]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/35">
          Limits
        </p>

        <div className="mt-4 grid gap-3 text-sm text-white/60">
          <p>AI review credits: {formatLimit(plan.aiReviewCredits)}</p>
          <p>Repositories: {formatLimit(plan.repositoryLimit)}</p>
          <p>Projects: {formatLimit(plan.projectLimit)}</p>
          <p>PRDs: {formatLimit(plan.prdLimit)}</p>
          <p>
            Premium workflow: {plan.premiumWorkflow ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>

      {isCurrent ? (
        <button
          type="button"
          disabled
          className="mt-8 w-full rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-white/45"
        >
          Current plan
        </button>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={disabled || !isAdmin || loading}
          className="mt-8 w-full rounded-xl bg-[#aa4825] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#bd5530] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Opening Razorpay..."
            : isAdmin
              ? "Upgrade with Razorpay"
              : "Only admin can upgrade"}
        </button>
      )}
    </article>
  );
}

function Entitlement({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}