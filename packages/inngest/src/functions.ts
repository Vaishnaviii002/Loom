import { db } from "@shipflow/db";
import {
  generateEngineeringTasks,
  generatePrd,
  runDiscoveryAgent,
} from "@shipflow/ai";
import { inngest } from "./client";

type DiscoveryEventData = {
  featureRequestId: string;
};

type PrdGenerateEventData = {
  featureRequestId: string;
  requestedById: string;
};

type TaskGenerateEventData = {
  featureRequestId: string;
  requestedById: string;
};

type ConversationMessageForAI = {
  role: string;
  content: string;
};

export const discoveryRun = inngest.createFunction(
  {
    id: "ai-discovery-run",
    name: "AI Discovery Run",
    triggers: [{ event: "ai/discovery.run" }],
  },
  async ({ event, step }: any) => {
    const data = event.data as DiscoveryEventData;
    const featureRequestId = data.featureRequestId;

    const featureRequest = await step.run(
      "load-feature-request-context",
      async () => {
        return db.featureRequest.findUnique({
          where: {
            id: featureRequestId,
          },
          include: {
            project: true,
            conversationMessages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });
      },
    );

    if (!featureRequest) {
      throw new Error("Feature request not found.");
    }

    const previousRequests = await step.run(
      "load-previous-requests",
      async () => {
        return db.featureRequest.findMany({
          where: {
            projectId: featureRequest.projectId,
            id: {
              not: featureRequest.id,
            },
          },
          select: {
            title: true,
            type: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        });
      },
    );

    await step.run("mark-discovery-status", async () => {
      return db.featureRequest.update({
        where: {
          id: featureRequest.id,
        },
        data: {
          status: "DISCOVERY",
        },
      });
    });

    const discovery = await step.run("run-ai-discovery-agent", async () => {
      return runDiscoveryAgent({
        project: {
          name: featureRequest.project.name,
          description: featureRequest.project.description,
          projectType: featureRequest.project.projectType,
          techStack: featureRequest.project.techStack,
          existingFeatures: featureRequest.project.existingFeatures,
          businessGoals: featureRequest.project.businessGoals,
          targetUsers: featureRequest.project.targetUsers,
        },
        request: {
          type: featureRequest.type,
          title: featureRequest.title,
          rawDescription: featureRequest.rawDescription,
        },
        previousRequests,
        conversation: featureRequest.conversationMessages.map(
          (message: ConversationMessageForAI) => ({
            role: message.role,
            content: message.content,
          }),
        ),
      });
    });

    await step.run("store-ai-discovery-message", async () => {
      return db.conversationMessage.create({
        data: {
          featureRequestId: featureRequest.id,
          role: "ASSISTANT",
          content: discovery.clientMessage,
        },
      });
    });

    await step.run("audit-discovery-result", async () => {
      return db.auditLog.create({
        data: {
          workspaceId: featureRequest.project.workspaceId,
          actorId: featureRequest.clientId,
          action: "ai.discovery.completed",
          entityType: "FeatureRequest",
          entityId: featureRequest.id,
          metadata: JSON.stringify({
            decision: discovery.decision,
            duplicateRisk: discovery.duplicateRisk,
            isValidRequest: discovery.isValidRequest,
            questions: discovery.questions,
          }),
        },
      });
    });

    return {
      featureRequestId: featureRequest.id,
      discovery,
    };
  },
);

export const prdGenerate = inngest.createFunction(
  {
    id: "ai-prd-generate",
    name: "AI PRD Generate",
    triggers: [{ event: "ai/prd.generate" }],
  },
  async ({ event, step }: any) => {
    const data = event.data as PrdGenerateEventData;
    const featureRequestId = data.featureRequestId;
    const requestedById = data.requestedById;

    const featureRequest = await step.run("load-request-for-prd", async () => {
      return db.featureRequest.findUnique({
        where: {
          id: featureRequestId,
        },
        include: {
          project: true,
          conversationMessages: {
            orderBy: {
              createdAt: "asc",
            },
          },
          prd: true,
        },
      });
    });

    if (!featureRequest) {
      throw new Error("Feature request not found.");
    }

    if (featureRequest.prd) {
      return {
        featureRequestId: featureRequest.id,
        prdId: featureRequest.prd.id,
        skipped: true,
        reason: "PRD already exists.",
      };
    }

    const generated = await step.run("generate-prd-with-ai", async () => {
      return generatePrd({
        project: {
          name: featureRequest.project.name,
          description: featureRequest.project.description,
          projectType: featureRequest.project.projectType,
          techStack: featureRequest.project.techStack,
          existingFeatures: featureRequest.project.existingFeatures,
          businessGoals: featureRequest.project.businessGoals,
          targetUsers: featureRequest.project.targetUsers,
        },
        request: {
          type: featureRequest.type,
          title: featureRequest.title,
          rawDescription: featureRequest.rawDescription,
        },
        conversation: featureRequest.conversationMessages.map(
          (message: ConversationMessageForAI) => ({
            role: message.role,
            content: message.content,
          }),
        ),
      });
    });

    const prd = await step.run("save-prd", async () => {
      return db.prd.create({
        data: {
          featureRequestId: featureRequest.id,
          problemStatement: generated.problemStatement,
          goals: generated.goals,
          nonGoals: generated.nonGoals,
          userStories: generated.userStories,
          edgeCases: generated.edgeCases,
          successMetrics: generated.successMetrics,
          acceptanceCriteria: {
            create: generated.acceptanceCriteria.map(
              (
                criterion: {
                  title: string;
                  description: string;
                },
                index: number,
              ) => ({
                title: criterion.title,
                description: criterion.description,
                order: index + 1,
              }),
            ),
          },
        },
        include: {
          acceptanceCriteria: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    });

    await step.run("mark-prd-draft-status", async () => {
      return db.featureRequest.update({
        where: {
          id: featureRequest.id,
        },
        data: {
          status: "PRD_DRAFT",
        },
      });
    });

    await step.run("audit-prd-generation", async () => {
      return db.auditLog.create({
        data: {
          workspaceId: featureRequest.project.workspaceId,
          actorId: requestedById,
          action: "ai.prd.generated",
          entityType: "Prd",
          entityId: prd.id,
          metadata: JSON.stringify({
            featureRequestId: featureRequest.id,
            acceptanceCriteriaCount: prd.acceptanceCriteria.length,
          }),
        },
      });
    });

    return {
      featureRequestId: featureRequest.id,
      prdId: prd.id,
      acceptanceCriteriaCount: prd.acceptanceCriteria.length,
    };
  },
);

export const taskGenerate = inngest.createFunction(
  {
    id: "ai-task-generate",
    name: "AI Task Generate",
    triggers: [{ event: "ai/tasks.generate" }],
  },
  async ({ event, step }: any) => {
    const data = event.data as TaskGenerateEventData;
    const featureRequestId = data.featureRequestId;
    const requestedById = data.requestedById;

    const featureRequest = await step.run("load-approved-prd", async () => {
      return db.featureRequest.findUnique({
        where: {
          id: featureRequestId,
        },
        include: {
          project: true,
          prd: {
            include: {
              acceptanceCriteria: {
                orderBy: {
                  order: "asc",
                },
              },
              tasks: true,
            },
          },
        },
      });
    });

    if (!featureRequest) {
      throw new Error("Feature request not found.");
    }

    if (!featureRequest.prd || !featureRequest.prd.approvedAt) {
      throw new Error("PRD must be approved before task generation.");
    }

    if (featureRequest.prd.tasks.length > 0) {
      return {
        featureRequestId: featureRequest.id,
        skipped: true,
        reason: "Tasks already exist.",
      };
    }

    const generated = await step.run("generate-engineering-tasks", async () => {
      return generateEngineeringTasks({
        project: {
          name: featureRequest.project.name,
          description: featureRequest.project.description,
          projectType: featureRequest.project.projectType,
          techStack: featureRequest.project.techStack,
          existingFeatures: featureRequest.project.existingFeatures,
          businessGoals: featureRequest.project.businessGoals,
          targetUsers: featureRequest.project.targetUsers,
        },
        prd: {
          problemStatement: featureRequest.prd.problemStatement,
          goals: featureRequest.prd.goals,
          nonGoals: featureRequest.prd.nonGoals,
          userStories: featureRequest.prd.userStories,
          edgeCases: featureRequest.prd.edgeCases,
          successMetrics: featureRequest.prd.successMetrics,
          acceptanceCriteria: featureRequest.prd.acceptanceCriteria.map(
            (criterion: {
              order: number;
              title: string;
              description: string;
            }) => ({
              order: criterion.order,
              title: criterion.title,
              description: criterion.description,
            }),
          ),
        },
      });
    });

    const tasks = await step.run("save-generated-tasks", async () => {
      return db.task.createMany({
        data: generated.tasks.map(
          (
            task: {
              title: string;
              description: string;
              priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
              acceptanceCriteriaRefs: number[];
              estimatedComplexity: "SMALL" | "MEDIUM" | "LARGE";
            },
            index: number,
          ) => ({
            prdId: featureRequest.prd!.id,
            title: task.title,
            description: [
              task.description,
              "",
              `Acceptance criteria refs: ${task.acceptanceCriteriaRefs
                .map((item) => `AC${item}`)
                .join(", ")}`,
              `Estimated complexity: ${task.estimatedComplexity}`,
            ].join("\n"),
            priority: task.priority,
            status: "TODO",
            order: index + 1,
          }),
        ),
      });
    });

    await step.run("mark-planning-status", async () => {
      return db.featureRequest.update({
        where: {
          id: featureRequest.id,
        },
        data: {
          status: "PLANNING",
        },
      });
    });

    await step.run("audit-task-generation", async () => {
      return db.auditLog.create({
        data: {
          workspaceId: featureRequest.project.workspaceId,
          actorId: requestedById,
          action: "ai.tasks.generated",
          entityType: "FeatureRequest",
          entityId: featureRequest.id,
          metadata: JSON.stringify({
            generatedTaskCount: generated.tasks.length,
          }),
        },
      });
    });

    return {
      featureRequestId: featureRequest.id,
      createdCount: tasks.count,
    };
  },
);

export const functions = [discoveryRun, prdGenerate, taskGenerate];
