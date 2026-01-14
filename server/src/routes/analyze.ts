import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { Idea } from "../models/Idea";
import { IdeaAnalysis } from "../models/IdeaAnalysis";
import { geminiClient } from "../lib/gemini";

const router = Router({ mergeParams: true });

const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 20,
  message: { message: "Daily analysis limit reached. Try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

const analysisSchema = z.object({
  ideaDevelopment: z.string(),
  competitors: z.array(z.string()),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  improvements: z.array(z.string()),
  searchDirections: z.array(z.string()),
});

function promptTemplate(ideaText: string) {
  return `
You are 'IdeaLab Analyzer', an AI research assistant for early-stage ideas.
Your tone is neutral, supportive, and educational.
Treat the input as an experimental draft.

TASK:
Analyze the idea provided below.
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
`.trim();
}

function extractJsonText(raw: string) {
  // Handle ```json ... ``` and ``` ... ``` wrappers
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // Otherwise try to find the first JSON object substring
  const firstObjStart = raw.indexOf("{");
  const lastObjEnd = raw.lastIndexOf("}");
  if (firstObjStart !== -1 && lastObjEnd !== -1 && lastObjEnd > firstObjStart) {
    return raw.slice(firstObjStart, lastObjEnd + 1).trim();
  }

  return raw.trim();
}

/**
 * @openapi
 * /api/ideas/{id}/analyze:
 *   post:
 *     summary: Analyze idea (Gemini)
 *     description: Sends the idea text to Gemini with a fixed rubric prompt and returns a structured JSON analysis. No request body.
 *     tags:
 *       - Analyze
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         description: Invalid idea id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Idea not found
 *       429:
 *         description: Rate limited
 *       502:
 *         description: Invalid AI response / AI error
 *       500:
 *         description: Server error
 */
router.post("/", requireAuth, limiter, async (req: AuthedRequest, res: any) => {
  try {
    const ideaId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ message: "Invalid idea id" });
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const cached = await IdeaAnalysis.findOne({
      ideaId: idea._id,
      ideaUpdatedAt: idea.updatedAt,
      question: "", 
    }).lean();

    if (cached) {
      return res.json({ ...cached.result, createdAt: cached.createdAt, fromCache: true });
    }

    const modelName = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
    if (!modelName) {
      return res.status(500).json({ message: "Gemini is not configured on the server" });
    }

    let genAI;
    try {
      genAI = geminiClient();
    } catch (e: any) {
      console.error("Gemini Config Error:", e?.message);
      return res.status(500).json({ message: "Gemini is not configured on the server" });
    }

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = promptTemplate(idea.text);

    let rawText = "";
    try {
      const result = await model.generateContent(prompt);
      rawText = result.response.text();
    } catch (e: any) {
      console.error("Gemini Upstream Error:", e?.message || e);
      return res.status(502).json({ message: "AI service error" });
    }

    const jsonText = extractJsonText(rawText);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      console.error("Gemini Parse Error (raw):", rawText);
      console.error("Gemini Parse Error (extracted):", jsonText);
      return res.status(502).json({ message: "AI returned invalid format" });
    }

    const analysisParsed = analysisSchema.safeParse(parsedJson);
    if (!analysisParsed.success) {
      console.error("Gemini Shape Error:", analysisParsed.error.flatten());
      return res.status(502).json({ message: "AI returned invalid format" });
    }

    let saved;
    try {
      saved = await IdeaAnalysis.create({
        ideaId: idea._id,
        ideaUpdatedAt: idea.updatedAt,
        question: "",
        result: analysisParsed.data,
      });
    } catch (e: any) {
      console.error("IdeaAnalysis DB Save Error:", e?.message || e);
      return res.status(500).json({ message: "Failed to persist analysis" });
    }

    return res.json({ ...saved.result, createdAt: saved.createdAt });
  } catch (error: any) {
    console.error("Gemini Route Error:", error?.message || error);
    console.error(error?.stack);
    return res.status(500).json({ message: "Internal server error during analysis" });
  }
});

export default router;
