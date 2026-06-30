import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@shipflow/db";


function cleanUrl(value?: string | null) {
  if (!value) return "";
  return value.trim().replace(/\/$/, "");
}

const appUrl =
  cleanUrl(process.env.BETTER_AUTH_URL) ||
  cleanUrl(process.env.NEXT_PUBLIC_APP_URL) ||
  "http://localhost:3000";

const netlifyUrl = process.env.NETLIFY_URL
  ? cleanUrl(`https://${process.env.NETLIFY_URL}`)
  : "";

const deployUrl = process.env.DEPLOY_URL
  ? cleanUrl(`https://${process.env.DEPLOY_URL}`)
  : "";

const vercelUrl = process.env.VERCEL_URL
  ? cleanUrl(`https://${process.env.VERCEL_URL}`)
  : "";

const trustedOrigins = Array.from(
  new Set(
    [
      appUrl,
      cleanUrl(process.env.NEXT_PUBLIC_APP_URL),

      // Local development
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",

      // Netlify / Vercel deploy URLs
      netlifyUrl,
      deployUrl,
      vercelUrl,

      // Wildcards for preview deploys
      "https://*.netlify.app",
      "https://*.vercel.app",
    ].filter(Boolean),
  ),
);

export const auth = betterAuth({
  baseURL: appUrl,
  trustedOrigins,

  // keep your existing database config
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // keep your existing email/password config
  emailAndPassword: {
    enabled: true,
  },

  // keep your other existing options below if you have them
});