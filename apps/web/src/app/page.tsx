import Link from "next/link";

const workflow = [
  { label: "Request", icon: "✉" },
  { label: "PRD", icon: "▣" },
  { label: "Tasks", icon: "☑" },
  { label: "Code", icon: "</>" },
  { label: "AI Review", icon: "◉" },
  { label: "Fixes", icon: "⚙" },
  { label: "Approval", icon: "✓" },
  { label: "Ship", icon: "🚀" },
];

const authRoutes = {
  signIn: "/auth/sign-in",
  getStarted: "/auth/sign-up",
};

const roles = [
  {
    title: "Client",
    icon: "♙",
    description: "Submit requests and approve PRDs.",
  },
  {
    title: "Developer",
    icon: "</>",
    description: "Build tasks and connect GitHub PRs.",
  },
  {
    title: "Human Reviewer",
    icon: "♚",
    description: "Verify PRD, code, AI review, and final release.",
  },
  {
    title: "Admin",
    icon: "⚙",
    description: "Track the complete platform and manage users.",
  },
];

const pricing = [
  {
    name: "Free Plan",
    price: "$0",
    tag: "For small teams",
    features: [
      "1 workspace",
      "1 project",
      "Manual requests",
      "5 AI reviews / month",
    ],
    highlighted: false,
  },
  {
    name: "Pro Plan",
    price: "$29",
    tag: "Most Popular",
    features: [
      "Multi projects",
      "More repositories",
      "AI review credits",
      "Advanced PRD reviews",
    ],
    highlighted: true,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#111111] text-white">
      <style>
        {`
          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(28px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes floatSoft {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-12px);
            }
          }

          @keyframes pulseGlow {
            0%, 100% {
              box-shadow: 0 0 0 rgba(170, 72, 37, 0);
            }
            50% {
              box-shadow: 0 0 38px rgba(170, 72, 37, 0.32);
            }
          }

          @keyframes rotateSlow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes orbitReverse {
            from {
              transform: rotate(360deg);
            }
            to {
              transform: rotate(0deg);
            }
          }

          .animate-fade-up {
            animation: fadeUp 0.8s ease both;
          }

          .animate-float-soft {
            animation: floatSoft 4.5s ease-in-out infinite;
          }

          .animate-pulse-glow {
            animation: pulseGlow 3s ease-in-out infinite;
          }

          .workflow-ring {
            animation: rotateSlow 24s linear infinite;
          }

          .workflow-node-content {
            animation: orbitReverse 24s linear infinite;
          }
        `}
      </style>

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <div className="pointer-events-none absolute left-[-120px] top-[-140px] h-[360px] w-[360px] rounded-full bg-[#aa4825]/20 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-[-140px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[#aa4825]/10 blur-[120px]" />

        <nav className="relative z-10 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            ShipFlow <span className="text-[#aa4825]">AI</span>
          </h1>

          <div className="flex items-center gap-3">
            <Link
              href={authRoutes.signIn}
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-white/75 transition hover:border-[#aa4825]/60 hover:text-white"
            >
              Sign in
            </Link>

            <Link
              href={authRoutes.getStarted}
              className="rounded-full bg-[#aa4825] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_30px_rgba(170,72,37,0.28)] transition hover:bg-[#8f3b1f]"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <div className="relative z-10 grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <div className="mb-5 inline-flex rounded-full border border-[#aa4825]/30 bg-[#aa4825]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#aa4825]">
              AI Product Delivery Pipeline
            </div>

            <h2 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
              From request to release,{" "}
              <span className="text-[#aa4825]">the smarter way to ship.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
              ShipFlow AI helps software teams move from feature request to PRD,
              tasks, GitHub pull request, AI review, fix loop, human approval,
              and shipped release.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={authRoutes.getStarted}
                className="rounded-full bg-[#aa4825] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3b1f]"
              >
                Start Workspace
              </Link>

              <Link
                href="#workflow"
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/75 transition hover:border-[#aa4825]/50 hover:text-white"
              >
                View Workflow
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex h-[430px] w-full max-w-[430px] items-center justify-center animate-float-soft">
            <div className="absolute h-[340px] w-[340px] rounded-full border border-white/10 bg-white/[0.02]" />
            <div className="absolute h-[260px] w-[260px] rounded-full border border-[#aa4825]/20" />

            <div className="workflow-ring relative h-[340px] w-[340px] rounded-full">
              {workflow.map((item, index) => {
                const angle = (360 / workflow.length) * index;

                return (
                  <div
                    key={item.label}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `rotate(${angle}deg) translate(170px) rotate(-${angle}deg)`,
                    }}
                  >
                    <div className="workflow-node-content -ml-[34px] -mt-[34px] flex h-[68px] w-[68px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#171717] text-center shadow-2xl">
                      <span className="text-sm font-bold text-[#aa4825]">
                        {item.icon}
                      </span>
                      <span className="mt-1 text-[10px] text-white/70">
                        {item.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="animate-pulse-glow absolute flex h-[118px] w-[118px] items-center justify-center rounded-3xl border border-[#aa4825]/35 bg-[#aa4825]/10">
              <div className="flex h-[72px] w-[72px] rotate-45 items-center justify-center rounded-2xl bg-[#aa4825] shadow-[0_0_40px_rgba(170,72,37,0.45)]">
                <span className="-rotate-45 text-3xl font-black text-white">
                  S
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#aa4825]">
              How ShipFlow Platform Works
            </p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight">
              Built for every part of the{" "}
              <span className="text-[#aa4825]">delivery workflow.</span>
            </h2>
            <div className="mt-10 h-px w-full bg-white/10" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role, index) => (
              <div
                key={role.title}
                className="animate-fade-up rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-2 hover:border-[#aa4825]/50 hover:bg-[#aa4825]/[0.06]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-5 text-3xl text-[#aa4825]">{role.icon}</div>
                <h3 className="text-base font-semibold text-white">
                  {role.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#aa4825]">
              Pricing
            </p>
            <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight">
              Simple plans for teams that{" "}
              <span className="text-[#aa4825]">ship faster.</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className="animate-fade-up rounded-2xl border border-white/10 bg-white/[0.035] p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <p className="mt-1 text-xs text-white/45">{plan.tag}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-xs text-white/40">/ month</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 text-sm text-white/60"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#aa4825]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  href={authRoutes.getStarted}
                  className="mt-6 block rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white/75 transition hover:border-[#aa4825]/50 hover:text-white"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
  <div className="animate-fade-up overflow-hidden rounded-lg border border-[#aa4825]/45 bg-gradient-to-r from-[#15110f] via-[#19120f] to-[#151515] px-8 py-5 shadow-[0_0_35px_rgba(170,72,37,0.12)]">
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr_1.2fr_auto]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#aa4825]/30 bg-[#aa4825]/10 text-xl shadow-[0_0_22px_rgba(170,72,37,0.18)]">
        🚀
      </div>

      <div>
        <h3 className="max-w-xs text-lg font-semibold leading-snug text-white">
          From request to release,{" "}
          <span className="text-white">the smarter way to ship.</span>
        </h3>
      </div>

      <p className="max-w-sm text-xs leading-5 text-white/45">
        Join product and engineering teams building better software, together.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href={authRoutes.getStarted}
          className="rounded-md bg-[#aa4825] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#8f3b1f]"
        >
          Get Started
        </Link>

        <Link
          href="#workflow"
          className="rounded-md border border-white/10 bg-black/20 px-5 py-2 text-xs font-semibold text-white/70 transition hover:border-[#aa4825]/50 hover:text-white"
        >
          View Workflow
        </Link>
      </div>
    </div>
  </div>

  <footer className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
    <p>© 2026 ShipFlow AI. All rights reserved.</p>
    <div className="flex gap-5">
      <span>Product</span>
      <span>Docs</span>
      <span>Pricing</span>
      <span>Privacy</span>
    </div>
  </footer>
</section>
    </main>
  );
}
