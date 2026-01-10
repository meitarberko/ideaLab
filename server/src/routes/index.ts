import dotenv from "dotenv";
import { Router } from "express";
import authRouter from "./auth";
import usersRouter from "./users";
import ideasRouter from "./ideas";


dotenv.config();
const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({ ok: true });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/ideas", ideasRouter);


export default apiRouter;
