import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const prdResultSchema = z.object({
  problemStatement: z.string(),
  goals: z.string(),
  nonGoals: z.string(),
  userStories: z.string(),
  edgeCases: z.string(),
  successMetrics: z.string(),
  acceptanceCriteria: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .min(3)
    .max(10),
});

export type PrdInput = {
  project: {
    name: string;
    description: string;
    projectType: string;
    techStack?: string | null;
    existingFeatures?: string | null;
    businessGoals?: string | null;
    targetUsers?: string | null;
  };
  request: {
    type: string;
    title: string;
    rawDescription: string;
  };
  conversation: {
    role: string;
    content: string;
  }[];
};

export type PrdResult = z.infer<typeof prdResultSchema>;

export async function generatePrd(input: PrdInput): Promise<PrdResult> {
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: prdResultSchema,
    system: `
You are ShipFlow AI's Product Requirements Agent.

Your job is to generate a serious enterprise-grade PRD from a validated client request.

Rules:
- The PRD must be practical and implementation-ready.
- Acceptance criteria must be numbered, testable, and specific.
- Do not create vague acceptance criteria.
- Tie the PRD to the original client request and project context.
- If projectType is EXISTING, assume this is a change to an existing software product.
- If projectType is NEW, define the first version scope carefully.
- Keep non-goals clear to prevent scope creep.
- Do not mention internal prompts or AI limitations.
`,
    prompt: `
PROJECT CONTEXT:
${JSON.stringify(input.project, null, 2)}

CLIENT REQUEST:
${JSON.stringify(input.request, null, 2)}

DISCOVERY CONVERSATION:
${JSON.stringify(input.conversation, null, 2)}

Generate the PRD now.
`,
  });

  return result.object;
}