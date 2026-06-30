export const BILLING_PLANS = {
  FREE: {
    id: "FREE",
    name: "Free Plan",
    priceLabel: "₹0",
    amount: 0,
    currency: "INR",
    aiReviewCredits: 10,
    repositoryLimit: 1,
    projectLimit: 1,
    prdLimit: 1,
    premiumWorkflow: false,
    features: [
      "1 workspace",
      "1 project",
      "1 repository",
      "1 PRD",
      "10 AI review credits",
      "Manual request workflow",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro Plan",
    priceLabel: "₹2,499",
    amount: 249900,
    currency: "INR",
    aiReviewCredits: 1000,
    repositoryLimit: -1,
    projectLimit: -1,
    prdLimit: -1,
    premiumWorkflow: true,
    features: [
      "Unlimited projects",
      "Unlimited repositories",
      "Unlimited PRDs",
      "1000 AI review credits",
      "GitHub PR review workflow",
      "Premium workflow automation",
      "Priority AI review flow",
    ],
  },
} as const;

export type BillingPlanId = keyof typeof BILLING_PLANS;

export function formatLimit(value: number) {
  return value === -1 ? "Unlimited" : String(value);
}