import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Idea } from "../models/Idea";
import { IdeaAnalysis } from "../models/IdeaAnalysis";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { geminiClient } from "../lib/gemini";

const router = Router({ mergeParams: true });

const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, 
  limit: 20,
  message: { message: "Daily analysis limit reached. Try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false
});

const bodySchema = z.object({
  question: z.string().max(400).optional()
});

function promptTemplate(ideaText: string, question: string) {
  return `
You are 'IdeaLab Analyzer', an AI research assistant for early-stage ideas.
Your tone is neutral, supportive, and educational. 
Treat the input as an experimental draft.

TASK:
Analyze the idea provided below. If a user question is provided, address it within the analysis.
You MUST return the response as a VALID JSON object.

REQUIRED JSON STRUCTURE:
{
  "ideaDevelopment": "string",
  "competitors": ["string"],
  "risks": ["string"],
  "opportunities": ["string"],
  "improvements": ["string"],
  "searchDirections": ["string"]
}

DATA TO ANALYZE:
Idea Text: """${ideaText}"""
User Question: """${question || "General analysis requested"}"""
`.trim();
}

/**
 * @openapi
 * /api/ideas/{id}/analyze:
 *   post:
 *     summary: Analyze idea
 *     tags:
 *       - Analyze
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         description: Validation error
 *       404:
 *         description: Not found
 *       429:
 *         description: Rate limited
 *       502:
 *         description: Invalid AI response
 *       500:
 *         description: Server error
 */
router.post("/", requireAuth, limiter, async (req: AuthedRequest, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation error" });

    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const question = (parsed.data.question || "").trim();
    const cacheKeyQuestion = question || "";

    const cached = await IdeaAnalysis.findOne({
      ideaId: idea._id,
      ideaUpdatedAt: idea.updatedAt,
      question: cacheKeyQuestion
    }).lean();

    if (cached) {
      return res.json({ ...cached.result, createdAt: cached.createdAt, fromCache: true });
    }

    const genAI = geminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"; 
    const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = promptTemplate(idea.text, question);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (parseError) {
      console.error("Gemini Parse Error:", text);
      return res.status(502).json({ message: "AI returned invalid format" });
    }

    const saved = await IdeaAnalysis.create({
      ideaId: idea._id,
      ideaUpdatedAt: idea.updatedAt,
      question: cacheKeyQuestion,
      result: jsonResponse
    });

    res.json({ ...saved.result, createdAt: saved.createdAt });

  } catch (error: any) {
    console.error("Gemini Route Error:", error);
    res.status(500).json({ message: "Internal server error during analysis" });
  }
});

export default router;