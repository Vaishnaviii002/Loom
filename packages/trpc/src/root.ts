import { createTRPCRouter } from "./trpc";
import { healthRouter } from "./routers/health";
import { workspaceRouter } from "./routers/workspace";
import { projectRouter } from "./routers/project";
import { inviteRouter } from "./routers/invite";
import { featureRequestRouter } from "./routers/feature-request";
import { pmRouter } from "./routers/pm";
import { seniorEngineerRouter } from "./routers/senior-engineer";
import { developerRouter } from "./routers/developer";
import { githubRouter } from "./routers/github";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  invite: inviteRouter,
  featureRequest: featureRequestRouter,
  pm: pmRouter,
  seniorEngineer: seniorEngineerRouter,
  developer: developerRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;