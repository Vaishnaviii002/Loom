import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const taskGenerationSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
        acceptanceCriteriaRefs: z.array(z.number()).min(1),
        estimatedComplexity: z.enum(["SMALL", "MEDIUM", "LARGE"]),
      }),
    )
    .min(2)
    .max(12),
});

export type TaskGenerationInput = {
  project: {
    name: string;
    description: string;
    projectType: string;
    techStack?: string | null;
    existingFeatures?: string | null;
    businessGoals?: string | null;
    targetUsers?: string | null;
  };
  prd: {
    problemStatement: string;
    goals: string;
    nonGoals: string;
    userStories: string;
    edgeCases: string;
    successMetrics: string;
    acceptanceCriteria: {
      order: number;
      title: string;
      description: string;
    }[];
  };
};

export type TaskGenerationResult = z.infer<typeof taskGenerationSchema>;

export async function generateEngineeringTasks(
  input: TaskGenerationInput,
): Promise<TaskGenerationResult> {
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: taskGenerationSchema,
    system: `
You are Loom's Senior Engineering Planner.

Your job is to break an approved PRD into engineering tasks.

Rules:
- Create implementation-ready engineering tasks.
- Every task must map to at least one acceptance criterion.
- Do not create vague tasks like "fix bugs" or "improve UI".
- Tasks should be useful for developers working from GitHub PRs.
- Prefer clear slices: backend, frontend, database, validation, testing, integration.
- Keep tasks practical and scoped.
- Do not invent unrelated features.
`,
    prompt: `
PROJECT:
${JSON.stringify(input.project, null, 2)}

APPROVED PRD:
${JSON.stringify(input.prd, null, 2)}

Generate engineering tasks now.
`,
  });

  return result.object;
}