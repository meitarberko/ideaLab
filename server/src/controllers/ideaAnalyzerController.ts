import { Request, Response } from "express";
import mongoose from "mongoose";
import { Idea } from "../models/Idea";
import { analyzeIdeaWithGroq } from "../services/groqService";

export async function analyzeIdeaController(req: Request, res: Response) {
  try {
    const ideaId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ message: "Invalid idea id" });
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const cachedAnalysis = idea.analysisCache?.analysis;
    const hasCachedAnalysis = Boolean(
      idea.analysisCache?.createdAt &&
        cachedAnalysis?.development?.question &&
        cachedAnalysis?.risks?.question &&
        cachedAnalysis?.opportunities?.question &&
        cachedAnalysis?.improvements?.question
    );

    if (hasCachedAnalysis && cachedAnalysis) {
      console.log(`[analyzer] Returning cached analyzer result for idea ${ideaId}`);
      return res.status(200).json({
        ideaId: String(idea._id),
        analysis: cachedAnalysis,
        cached: true
      });
    }

    const analysis = await analyzeIdeaWithGroq(idea.text);

    idea.analysisCache = {
      createdAt: new Date(),
      analysis
    };

    await idea.save();
    console.log(`[analyzer] Stored analyzer result in cache for idea ${ideaId}`);

    return res.status(200).json({
      ideaId: String(idea._id),
      analysis,
      cached: false
    });
  } catch (error: any) {
    const status = Number(error?.status) || 500;

    if (status >= 500) {
      console.error("Idea analyzer error:", error?.message || error);
    }

    if (status === 500 && String(error?.message || "").includes("GROQ_API_KEY")) {
      return res.status(500).json({ message: "Analyzer service is not configured" });
    }

    if (status === 502) {
      return res.status(502).json({ message: "AI service error" });
    }

    return res.status(status).json({ message: status >= 500 ? "Internal server error" : error?.message || "Request failed" });
  }
}
