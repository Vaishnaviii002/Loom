import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

async function getRedirectPath(userId: string, email: string) {
  const membership = await db.membership.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return "/auth/sign-in";
  }

  if (membership.role === "CLIENT") {
    const access = await db.clientProjectAccess.findFirst({
      where: {
        clientId: userId,
      },
      select: {
        projectId: true,
      },
    });

    return access?.projectId
      ? `/client/dashboard?projectId=${access.projectId}`
      : "/client/dashboard";
  }

  if (membership.role === "PM") {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email,
        role: "PM" as any,
        status: "ACCEPTED" as any,
        projectId: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
      select: {
        projectId: true,
      },
    });

    return acceptedInvite?.projectId
      ? `/pm?projectId=${acceptedInvite.projectId}`
      : "/pm";
  }

  if (membership.role === "DEVELOPER") {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email,
        role: "DEVELOPER" as any,
        status: "ACCEPTED" as any,
        projectId: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
      select: {
        projectId: true,
      },
    });

    return acceptedInvite?.projectId
      ? `/dev?projectId=${acceptedInvite.projectId}`
      : "/dev";
  }

  if (membership.role === "SENIOR_ENG") {
    const acceptedInvite = await db.invite.findFirst({
      where: {
        email,
        role: "SENIOR_ENG" as any,
        status: "ACCEPTED" as any,
        projectId: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
      select: {
        projectId: true,
      },
    });

    return acceptedInvite?.projectId
      ? `/review?projectId=${acceptedInvite.projectId}`
      : "/review";
  }

  if (membership.role === "ADMIN") {
    return "/admin/projects";
  }

  return "/auth/redirect";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = sanitizeText(String(body.email ?? "")).toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const signInResponse = await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe: true,
      },
      headers: await headers(),
      asResponse: true,
    } as any);

    if (!signInResponse.ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account was not found." },
        { status: 404 },
      );
    }

    const redirectTo = await getRedirectPath(user.id, user.email);

    const response = NextResponse.json({
      ok: true,
      redirectTo,
    });

    const setCookies =
      (signInResponse.headers as any).getSetCookie?.() ??
      [signInResponse.headers.get("set-cookie")].filter(Boolean);

    for (const cookie of setCookies) {
      response.headers.append("Set-Cookie", cookie);
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }
}