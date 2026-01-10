import { z } from "zod";

export const createIdeaBodySchema = z.object({
  text: z.string().min(1, "Idea text is required")
});

export const ideaIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid idea id")
});
