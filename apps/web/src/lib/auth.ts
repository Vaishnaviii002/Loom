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
      process.env.URL ? cleanUrl(`https://${process.env.URL}`) : "",
      process.env.DEPLOY_URL
        ? cleanUrl(`https://${process.env.DEPLOY_URL}`)
        : "",
      process.env.NETLIFY_URL
        ? cleanUrl(`https://${process.env.NETLIFY_URL}`)
        : "",
    ].filter(Boolean),
  ),
);

export const auth = betterAuth({
  baseURL: appUrl,
  trustedOrigins,

  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});