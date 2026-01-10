import express from "express";
import cookieParser from "cookie-parser";
import apiRouter from "../routes";

export function makeTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api", apiRouter);
  return app;
}
