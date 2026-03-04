import Groq from "groq-sdk";
import { z } from "zod";
import { IDEA_ANALYZER_PROMPT } from "../prompts/ideaAnalyzerPrompt";

const analyzerSectionSchema = z.object({
  question: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  examples: z.array(z.string().trim().min(1))
});

export const analyzerResultSchema = z.object({
  development: analyzerSectionSchema,
  risks: analyzerSectionSchema,
  opportunities: analyzerSectionSchema,
  improvements: analyzerSectionSchema
});

export type AnalyzerResult = z.infer<typeof analyzerResultSchema>;

const FALLBACK_ANALYSIS: AnalyzerResult = {
  development: {
    question: "Have you explored possible development directions for this idea?",
    explanation: "Consider thinking about how this idea could evolve into a practical solution.",
    examples: []
  },
  risks: {
    question: "Have you considered possible risks or challenges?",
    explanation: "Every idea may face technical, financial, or market risks.",
    examples: []
  },
  opportunities: {
    question: "Have you identified potential opportunities this idea might create?",
    explanation: "Opportunities may include market demand, innovation, or social impact.",
    examples: []
  },
  improvements: {
    question: "Have you considered ways to improve this idea?",
    explanation: "Ideas can often be strengthened through iteration and feedback.",
    examples: []
  }
};

function useFallback(reason: string, details?: unknown): AnalyzerResult {
  console.warn(`[analyzer] ${reason} - using fallback`);
  if (details) console.warn("[analyzer] fallback details:", details);
  return FALLBACK_ANALYSIS;
}

function extractJsonText(raw: string) {
  const withoutFences = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const regexMatch = withoutFences.match(/\{[\s\S]*\}/);
  const source = regexMatch?.[0] || withoutFences;

  const first = source.indexOf("{");
  if (first === -1) return source;

  let depth = 0;
  for (let i = first; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(first, i + 1).trim();
    }
  }

  return source.trim();
}

export async function analyzeIdeaWithGroq(ideaText: string): Promise<AnalyzerResult> {
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  console.log(`[analyzer] Groq model used: ${model}`);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return useFallback("GROQ_API_KEY is missing");
  }

  const client = new Groq({ apiKey });

  let content = "";
  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: IDEA_ANALYZER_PROMPT },
        { role: "user", content: `Idea text:\n${ideaText}` }
      ]
    });

    content = completion.choices?.[0]?.message?.content || "";
    console.log("[analyzer] Groq raw response:", content.slice(0, 200));
  } catch (e) {
    console.error("[analyzer] Groq request failed:", e);
    return useFallback("Groq request failed", e);
  }

  const jsonText = extractJsonText(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("[analyzer] AI parsing failed from text:", jsonText.slice(0, 200));
    return useFallback("AI parsing failed");
  }

  const validated = analyzerResultSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[analyzer] AI schema validation failed:", validated.error.flatten());
    return useFallback("AI schema validation failed");
  }

  return validated.data;
}
