"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoomLogo } from "@/components/brand/loom-logo";

type AdminUser = {
  name: string;
  email: string;
  role: string;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

type ProjectMember = {
  id: string;
  role: string;
  status?: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
};

type Project = {
  id: string;
  name: string;
  description: string;
  type: string;
  techStack: string;
  existingFeatures: string;
  businessGoals: string;
  createdAt: string;
  requestCount: number;
  repo: {
    repoFullName: string;
  } | null;
  members: ProjectMember[];
};

type WorkspaceMember = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
};

type ActiveView = "projects" | "manage" | "audit" | "settings" | "billing";

export default function AdminDashboardClient({
  user,
  workspace,
  projects,
  members,
}: {
  user: AdminUser;
  workspace: Workspace;
  projects: Project[];
  members: WorkspaceMember[];
}) {
  const router = useRouter();

  const [activeView, setActiveView] = useState<ActiveView>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id ?? "",
  );
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    router.replace("/auth/sign-in");
    router.refresh();
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId);
    setActiveView("manage");
  }

  async function deleteProject(projectId: string, projectName: string) {
    const confirmed = window.confirm(
      `Delete "${projectName}"? This will remove the project and its connected records.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingProjectId(projectId);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || "Unable to delete project.");
        return;
      }

      if (selectedProjectId === projectId) {
        setSelectedProjectId("");
      }

      setActiveView("projects");
      router.refresh();
    } catch {
      alert("Something went wrong while deleting the project.");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="grid min-h-screen lg:grid-cols-[20%_80%]">
        <aside className="flex min-h-screen flex-col border-r border-white/10 bg-[#0f0f0f]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-8">
              <div>
                <LoomLogo size="small" />
                <p className="mt-10 text-s text-white/40">Admin Portal</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              <SidebarButton
                label="Projects"
                active={activeView === "projects"}
                onClick={() => setActiveView("projects")}
              />

              <SidebarButton
                label="Audit Log"
                active={activeView === "audit"}
                onClick={() => setActiveView("audit")}
              />

              <SidebarButton
                label="Settings"
                active={activeView === "settings"}
                onClick={() => setActiveView("settings")}
              />

              <SidebarButton
                label="Billing"
                active={activeView === "billing"}
                onClick={() => setActiveView("billing")}
              />
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="mt-1 truncate text-xs text-white/40">
                {user.email}
              </p>
              <p className="mt-2 text-xs text-[#aa4825]">{user.role}</p>
            </div>
          </div>
        </aside>

        <section className="min-h-screen overflow-y-auto bg-[#111111]">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#111111]/95 px-8 py-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {titleByView(activeView)}
                </h1>

                <p className="mt-1 text-sm text-white/45">
                  {subtitleByView(activeView)}
                </p>
              </div>

              {(activeView === "projects" || activeView === "manage") && (
                <Link
                  href="/admin/projects/new"
                  className="rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
                >
                  New project
                </Link>
              )}
            </div>
          </header>

          <div className="px-8 py-8">
            {activeView === "projects" && (
              <ProjectsTable
                projects={projects}
                onOpenManage={openProject}
                onDeleteProject={deleteProject}
                deletingProjectId={deletingProjectId}
              />
            )}

            {activeView === "manage" && (
              <ManageProjectsOneCard selectedProject={selectedProject} />
            )}

            {activeView === "audit" && (
              <AuditLog projects={projects} members={members} user={user} />
            )}

            {activeView === "settings" && (
              <Settings
                workspace={workspace}
                user={user}
                onSignOut={handleSignOut}
              />
            )}

            {activeView === "billing" && <Billing />}
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function titleByView(view: ActiveView) {
  if (view === "projects") return "Projects";
  if (view === "manage") return "Manage Projects";
  if (view === "audit") return "Project Members";
  if (view === "settings") return "Settings";
  return "Billing";
}

function subtitleByView(view: ActiveView) {
  if (view === "projects") {
    return "Every project your team is delivering across the company.";
  }

  if (view === "manage") {
    return "Project details and project-specific members.";
  }

  if (view === "audit") {
    return "Members grouped by assigned project, role, and portal access.";
  }

  if (view === "settings") {
    return "Workspace and account controls.";
  }

  return "Choose the right plan for your delivery workflow.";
}

function ProjectsTable({
  projects,
  onOpenManage,
  onDeleteProject,
  deletingProjectId,
}: {
  projects: Project[];
  onOpenManage: (projectId: string) => void;
  onDeleteProject: (projectId: string, projectName: string) => void;
  deletingProjectId: string | null;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
      <div className="grid grid-cols-[1.2fr_1.6fr_0.7fr_0.9fr_1.2fr] border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/40">
        <p>Name</p>
        <p>Repository</p>
        <p>Members</p>
        <p>Created</p>
        <p>Actions</p>
      </div>

      {projects.length === 0 ? (
        <div className="px-5 py-8 text-sm text-white/45">
          No projects created yet.
        </div>
      ) : (
        projects.map((project) => {
          const isDeleting = deletingProjectId === project.id;

          return (
            <div
              key={project.id}
              className="grid grid-cols-[1.2fr_1.6fr_0.7fr_0.9fr_1.2fr] items-center border-b border-white/10 px-5 py-4 text-sm transition last:border-b-0 hover:bg-white/5"
            >
              <p className="font-semibold text-white">{project.name}</p>

              <p className="font-mono text-white/45">
                {project.repo?.repoFullName ?? "Not connected"}
              </p>

              <p className="text-white/50">{project.members.length}</p>

              <p className="text-white/45">{formatDate(project.createdAt)}</p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenManage(project.id)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  Open
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => onDeleteProject(project.id, project.name)}
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-200 transition hover:border-red-500/60 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

function ManageProjectsOneCard({
  selectedProject,
}: {
  selectedProject: Project | null;
}) {
  if (!selectedProject) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#171717] p-8">
        <h2 className="text-xl font-semibold">No project selected</h2>
        <p className="mt-2 text-sm text-white/45">
          Create or open a project to view project details and members.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#aa4825]">
              Project Detail
            </p>

            <h2 className="mt-3 text-4xl font-semibold">
              {selectedProject.name}
            </h2>
          </div>

          <Link
            href={`/admin/invites?projectId=${selectedProject.id}`}
            className="rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
          >
            Invite member
          </Link>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        <InfoRow
          title="Description"
          value={selectedProject.description || "No description added."}
        />

        <InfoRow
          title="Tech stack"
          value={selectedProject.techStack || "No tech stack added."}
        />

        <InfoRow
          title="GitHub repository"
          value={
            selectedProject.repo?.repoFullName || "Repository not connected."
          }
        />
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <div>
          <h3 className="text-lg font-semibold">Added members</h3>
          <p className="mt-1 text-sm text-white/45">
            Members assigned only to this project.
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1fr_1.3fr_0.7fr_0.8fr_1.4fr_0.8fr] border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/40">
            <p>Name</p>
            <p>Email</p>
            <p>Role</p>
            <p>Status</p>
            <p>Login details</p>
            <p>Added</p>
          </div>

          {selectedProject.members.length === 0 ? (
            <div className="px-5 py-6 text-sm text-white/45">
              No members added to this project yet.
            </div>
          ) : (
            selectedProject.members.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-[1fr_1.3fr_0.7fr_0.8fr_1.4fr_0.8fr] border-b border-white/10 px-5 py-4 text-sm last:border-b-0"
              >
                <p className="font-medium text-white">
                  {member.user.name || "Member"}
                </p>

                <p className="text-white/45">{member.user.email}</p>

                <p className="text-white/45">{member.role}</p>

                <p className="text-white/45">{member.status ?? "ACTIVE"}</p>

                <div className="space-y-1 text-xs">
                  <p className="text-white/65">
                    Name:{" "}
                    <span className="text-white">
                      {member.user.name || "Member"}
                    </span>
                  </p>

                  <p className="text-white/65">
                    Email:{" "}
                    <span className="text-white">{member.user.email}</span>
                  </p>

                  <p className="text-white/35">Password: hidden after setup</p>
                </div>

                <p className="text-white/45">{formatDate(member.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function AuditLog({
  projects,
}: {
  projects: Project[];
  members: WorkspaceMember[];
  user: AdminUser;
}) {
  const rows = projects.flatMap((project) =>
    project.members.map((member) => ({
      id: `${project.id}-${member.id}`,
      memberName: member.user.name || "Pending user",
      memberEmail: member.user.email,
      projectId: project.id,
      projectName: project.name,
      role: member.role,
      viewLabel: getViewLabel(member.role),
      viewHref: getViewHref(member.role, project.id),
    })),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
      <div className="grid grid-cols-[1.2fr_1.1fr_0.8fr_0.9fr] border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-white/40">
        <p>Member</p>
        <p>Project</p>
        <p>Role</p>
        <p>View page</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-sm text-white/45">
          No project members have joined yet.
        </div>
      ) : (
        rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[1.2fr_1.1fr_0.8fr_0.9fr] items-center border-b border-white/10 px-5 py-4 text-sm last:border-b-0"
          >
            <div>
              <p className="font-semibold text-white">{row.memberName}</p>
              <p className="mt-1 text-xs text-white/40">{row.memberEmail}</p>
            </div>

            <p className="font-medium text-white/70">{row.projectName}</p>

            <p className="text-white/45">{formatRole(row.role)}</p>

            <Link
              href={row.viewHref}
              className="w-fit rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
            >
              {row.viewLabel}
            </Link>
          </div>
        ))
      )}
    </section>
  );
}

function getViewLabel(role: string) {
  if (role === "CLIENT") return "Client dashboard";
  if (role === "PM") return "PM dashboard";
  if (role === "DEVELOPER") return "Developer dashboard";
  if (role === "SENIOR_ENG") return "Engineer dashboard";
  return "View page";
}

function getViewHref(role: string, projectId: string) {
  if (role === "CLIENT") {
    return `/client/dashboard?projectId=${projectId}&preview=admin`;
  }

  if (role === "PM") {
    return `/pm?projectId=${projectId}&preview=admin`;
  }

  if (role === "DEVELOPER") {
    return `/dev?projectId=${projectId}&preview=admin`;
  }

  if (role === "SENIOR_ENG") {
    return `/review?projectId=${projectId}&preview=admin`;
  }

  return "/admin";
}

function formatRole(role: string) {
  if (role === "CLIENT") return "Client";
  if (role === "PM") return "Product Manager";
  if (role === "DEVELOPER") return "Developer";
  if (role === "SENIOR_ENG") return "Senior Engineer";
  if (role === "ADMIN") return "Admin";

  return role;
}

function Settings({
  workspace,
  user,
  onSignOut,
}: {
  workspace: Workspace;
  user: AdminUser;
  onSignOut: () => void;
}) {
  return (
    <section className="max-w-3xl rounded-2xl border border-white/10 bg-[#171717] p-6">
      <h2 className="text-xl font-semibold">Workspace settings</h2>

      <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10">
        <InfoRow title="Admin email" value={user.email} />
        <InfoRow title="Role" value={user.role} />
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-6 rounded-xl bg-[#aa4825] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
      >
        Sign out
      </button>
    </section>
  );
}

function Billing() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PlanCard
        name="Free"
        price="$0"
        description="For trying Loom with one small team workflow."
        features={[
          "1 workspace",
          "1 project",
          "1 PRD",
          "Manual requests",
          "Limited AI credits",
        ]}
        button="Current plan"
        highlighted={false}
      />

      <PlanCard
        name="Pro"
        price="$29"
        description="For production teams managing multiple projects and reviews."
        features={[
          "Unlimited projects",
          "Unlimited PRDs",
          "Unlimited team members",
          "GitHub PR review workflow",
          "Higher AI review credits",
          "Priority workflow automation",
        ]}
        button="Upgrade with Razorpay later"
        highlighted
      />
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  features,
  button,
  highlighted,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  button: string;
  highlighted: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 ${
        highlighted
          ? "border-[#aa4825]/50 bg-[#aa4825]/10 shadow-[0_0_40px_rgba(170,72,37,0.14)]"
          : "border-white/10 bg-[#171717]"
      }`}
    >
      <p className="text-sm font-semibold text-[#aa4825]">{name} Plan</p>

      <div className="mt-4 flex items-end gap-2">
        <h2 className="text-4xl font-semibold">{price}</h2>
        <p className="pb-1 text-sm text-white/40">/ month</p>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/50">{description}</p>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex gap-3 text-sm text-white/65">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#aa4825]" />
            {feature}
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold ${
          highlighted
            ? "bg-[#aa4825] text-white hover:bg-[#8f3b1f]"
            : "border border-white/10 text-white/55"
        }`}
      >
        {button}
      </button>
    </section>
  );
}

function InfoRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-5 px-6 py-5 md:grid-cols-[28%_72%]">
      <p className="text-sm font-medium text-white/65">{title}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-white/45">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
