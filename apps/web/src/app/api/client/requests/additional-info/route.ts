import { auth } from "@/lib/auth";
import { db } from "@shipflow/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function appendAdditionalInfo(rawDescription: string, additionalInfo: string) {
  const marker = "\n\nAdditional information:\n";

  if (rawDescription.includes(marker)) {
    return `${rawDescription}\n\n- ${additionalInfo}`;
  }

  return `${rawDescription}${marker}- ${additionalInfo}`;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const requestId = sanitizeText(String(body.requestId ?? ""));
    const additionalInfo = sanitizeText(String(body.additionalInfo ?? ""));

    if (!requestId) {
      return NextResponse.json(
        { error: "Request id is required." },
        { status: 400 },
      );
    }

    if (!additionalInfo) {
      return NextResponse.json(
        { error: "Additional information is required." },
        { status: 400 },
      );
    }

    const ticket = await db.featureRequest.findFirst({
      where: {
        id: requestId,
        clientId: session.user.id,
      },
      select: {
        id: true,
        projectId: true,
        rawDescription: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Request not found." },
        { status: 404 },
      );
    }

    const access = await db.clientProjectAccess.findFirst({
      where: {
        clientId: session.user.id,
        projectId: ticket.projectId,
      },
    });

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this request." },
        { status: 403 },
      );
    }

    const rawDescription = appendAdditionalInfo(
      ticket.rawDescription || "",
      additionalInfo,
    );

    const updatedTicket = await db.featureRequest.update({
      where: {
        id: ticket.id,
      },
      data: {
        rawDescription,
      },
      select: {
        id: true,
        rawDescription: true,
      },
    });

    return NextResponse.json({
      ok: true,
      requestId: updatedTicket.id,
      rawDescription: updatedTicket.rawDescription,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to add additional information." },
      { status: 500 },
    );
  }
}