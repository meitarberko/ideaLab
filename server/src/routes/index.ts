import { Router } from "express";

const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default apiRouter;
