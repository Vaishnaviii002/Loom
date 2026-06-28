import { db } from "@shipflow/db";
import { notFound } from "next/navigation";
import InviteJoinClient from "./invite-join-client";

export const runtime = "nodejs";

type InviteJoinPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InviteJoinPage({ params }: InviteJoinPageProps) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  if (!token) {
    notFound();
  }

  const invite = await db.invite.findUnique({
    where: {
      token,
    },
    include: {
      workspace: true,
      project: {
        include: {
          gitHubRepo: true,
        },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  const isExpired = invite.expiresAt.getTime() < Date.now();
  const isAccepted = invite.status === "ACCEPTED";
  const isRevoked = invite.status === "REVOKED";
  const isPending = invite.status === "PENDING";

  return (
    <InviteJoinClient
      token={invite.token}
      email={invite.email}
      role={invite.role}
      workspaceName={invite.workspace.name}
      projectId={invite.projectId ?? ""}
      projectName={invite.project?.name ?? "Assigned project"}
      repository={invite.project?.gitHubRepo?.repoFullName ?? ""}
      isExpired={isExpired}
      isAccepted={isAccepted}
      isRevoked={isRevoked}
      canJoin={isPending && !isExpired && !isRevoked}
    />
  );
}