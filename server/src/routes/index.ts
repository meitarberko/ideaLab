import dotenv from "dotenv";
import { Router } from "express";
import authRouter from "./auth";
import usersRouter from "./users";
import ideasRouter from "./ideas";
import commentsRoot from "./commentsRoot";
import swaggerRouter from "./swagger";
import authGoogleRouter from "./authGoogle";


dotenv.config();
const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({ ok: true });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/auth", authGoogleRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/ideas", ideasRouter);
apiRouter.use("/comments", commentsRoot);
apiRouter.use("/swagger", swaggerRouter);

export default apiRouter;
