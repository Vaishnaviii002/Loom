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

const trustedOrigins = Array.from(
  new Set(
    [
      appUrl,
      cleanUrl(process.env.NEXT_PUBLIC_APP_URL),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.NETLIFY_URL
        ? cleanUrl(`https://${process.env.NETLIFY_URL}`)
        : "",
      process.env.URL ? cleanUrl(`https://${process.env.URL}`) : "",
      process.env.DEPLOY_URL
        ? cleanUrl(`https://${process.env.DEPLOY_URL}`)
        : "",
    ].filter(Boolean),
  ),
);
export const auth = betterAuth({
  appName: "Loom",
  baseURL: appUrl,
trustedOrigins,

  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: "http://localhost:3000",

  trustedOrigins: ["http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
});