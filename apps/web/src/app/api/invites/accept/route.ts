import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { NextRequest, NextResponse } from "next/server";


export const runtime = "nodejs";

function getRedirectPath(role: string, projectId: string | null) {
  if (role === "CLIENT") {
    return projectId
      ? `/client/dashboard?projectId=${projectId}`
      : "/client/dashboard";
  }

  if (role === "PM") {
    return projectId ? `/pm?projectId=${projectId}` : "/pm";
  }

  if (role === "DEVELOPER") {
    return projectId ? `/dev?projectId=${projectId}` : "/dev";
  }

  if (role === "SENIOR_ENG") {
    return projectId ? `/review?projectId=${projectId}` : "/review";
  }

  return "/auth/redirect";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const token = String(body.token ?? "").trim();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const invite = await db.invite.findUnique({
      where: {
        token,
      },
      include: {
        project: {
          include: {
            gitHubRepo: true,
          },
        },
        workspace: true,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found." },
        { status: 404 },
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invite has already been used." },
        { status: 400 },
      );
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      await db.invite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "EXPIRED" as any,
        },
      });

      return NextResponse.json(
        { error: "Invite has expired." },
        { status: 400 },
      );
    }

    let user = await db.user.findUnique({
      where: {
        email: invite.email,
      },
    });

    if (!user) {
      await auth.api.signUpEmail({
        body: {
          email: invite.email,
          name,
          password,
        },
      } as any);

      user = await db.user.findUnique({
        where: {
          email: invite.email,
        },
      });
    }

    const cleanName = name.trim();

if (user && cleanName) {
  user = await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      name: cleanName,
    },
  });
}

    if (!user) {
      return NextResponse.json(
        { error: "Unable to create invited user." },
        { status: 500 },
      );
    }

    await db.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
      update: {
        role: invite.role as any,
      },
      create: {
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role as any,
      },
    });

    if (invite.role === "CLIENT" && invite.projectId) {
      await db.clientProjectAccess.upsert({
        where: {
          clientId_projectId: {
            clientId: user.id,
            projectId: invite.projectId,
          },
        },
        update: {},
        create: {
          clientId: user.id,
          projectId: invite.projectId,
        },
      });
    }

    await db.invite.update({
      where: {
        id: invite.id,
      },
      data: {
        status: "ACCEPTED" as any,
        acceptedAt: new Date(),
      },
    });

    await db.auditLog
      .create({
        data: {
          workspaceId: invite.workspaceId,
          actorId: user.id,
          action: "member.joined",
          entityType: "Invite",
          entityId: invite.id,
          metadata: JSON.stringify({
            email: invite.email,
            name: cleanName,
            role: invite.role,
            projectId: invite.projectId,
            projectName: invite.project?.name ?? "",
            repository: invite.project?.gitHubRepo?.repoFullName ?? "",
          }),
        },
      })
      .catch(() => null);

    const signInResponse = await auth.api.signInEmail({
      body: {
        email: invite.email,
        password,
      },
      asResponse: true,
    } as any);

    const response = NextResponse.json({
      ok: true,
      redirectTo: getRedirectPath(invite.role, invite.projectId),
    });

    const setCookie = signInResponse.headers.get("set-cookie");

    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to accept invite.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}