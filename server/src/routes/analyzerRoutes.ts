import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { analyzeIdeaController } from "../controllers/ideaAnalyzerController";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /api/ideas/{id}/analyze:
 *   post:
 *     summary: Analyze idea with Groq
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
 *         content:
 *           application/json:
 *             example:
 *               ideaId: "64f1c2b5e4b0f1a2b3c4d5e6"
 *               analysis:
 *                 development:
 *                   question: "Have you explored development paths for this idea?"
 *                   explanation: "..."
 *                   examples: ["...", "..."]
 *                 risks:
 *                   question: "Did you identify main risks and dangers?"
 *                   explanation: "..."
 *                   examples: ["...", "..."]
 *                 opportunities:
 *                   question: "Did you map key opportunities?"
 *                   explanation: "..."
 *                   examples: ["...", "..."]
 *                 improvements:
 *                   question: "Did you define concrete improvements?"
 *                   explanation: "..."
 *                   examples: ["...", "..."]
 *               cached: false
 *       400:
 *         description: Invalid idea id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Idea not found
 *       502:
 *         description: AI service error
 */
router.post("/", requireAuth, analyzeIdeaController);

export default router;
