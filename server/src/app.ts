import "dotenv/config";
import express from "express";
import path from "path";
import apiRouter from "./routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import passport from "passport";
import { setupPassport } from "./lib/passport";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

const app = express();

setupPassport();
app.use(passport.initialize());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IdeaLab API",
      version: "1.0.0"
    }
  },
  apis: ["./src/routes/**/*.ts"]
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
console.log("check:", typeof apiRouter, typeof notFound, typeof errorHandler);

app.use("/uploads", express.static(uploadsDir));
console.log("check:", typeof apiRouter, typeof notFound, typeof errorHandler);

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
