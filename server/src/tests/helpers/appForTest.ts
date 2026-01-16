import express from "express";
import cookieParser from "cookie-parser";
import apiRouter from "../../routes";
import notFound from "../../middleware/notFound";
import errorHandler from "../../middleware/errorHandler";

export function makeTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api", apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
