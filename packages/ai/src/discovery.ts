import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const discoveryResultSchema = z.object({
  duplicateRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  isValidRequest: z.boolean(),
  decision: z.enum(["PROCEED", "NEEDS_CLARIFICATION", "DUPLICATE", "REJECT"]),
  summary: z.string(),
  reasoning: z.string(),
  questions: z.array(z.string()).max(5),
  clientMessage: z.string(),
});

export type DiscoveryInput = {
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
  previousRequests: {
    title: string;
    type: string;
    status: string;
  }[];
  conversation: {
    role: string;
    content: string;
  }[];
};

export type DiscoveryResult = z.infer<typeof discoveryResultSchema>;

export async function runDiscoveryAgent(
  input: DiscoveryInput,
): Promise<DiscoveryResult> {
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: discoveryResultSchema,
    system: `
You are Loom's Discovery Agent.

ShipFlow is an enterprise-grade software delivery lifecycle system.
Your job is NOT to blindly accept every request.

You must:
1. Check whether the request seems duplicate of an existing feature/request.
2. Check whether the request is valid and worth moving forward.
3. Ask useful clarification questions if context is missing.
4. Explain clearly to the client what happens next.

Important product rule:
- ShipFlow is mainly for existing software feature/bug/improvement requests.
- It also supports new product requests when projectType is NEW.
- Be practical, enterprise-grade, and concise.
- Do not mention internal implementation details like PRD/tasks unless useful to explain the lifecycle.
- Do not invent facts.
- If duplicate risk is high, explain that it may already exist and ask the client to confirm.
- If missing context, ask 2 to 5 specific questions.
`,
    prompt: `
PROJECT CONTEXT:
${JSON.stringify(input.project, null, 2)}

CURRENT REQUEST:
${JSON.stringify(input.request, null, 2)}

PREVIOUS REQUESTS:
${JSON.stringify(input.previousRequests, null, 2)}

CONVERSATION SO FAR:
${JSON.stringify(input.conversation, null, 2)}

Return a structured discovery decision.
`,
  });

  return result.object;
}