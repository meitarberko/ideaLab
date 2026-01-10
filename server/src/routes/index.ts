import dotenv from "dotenv";
import { Router } from "express";
import authRouter from "./auth";

dotenv.config();
const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({ ok: true });
});

apiRouter.use("/auth", authRouter);

export default apiRouter;
