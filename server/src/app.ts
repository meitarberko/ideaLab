import express from "express";
import path from "path";
import apiRouter from "./routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/errorHandler";

const app = express();


const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
console.log("check:", typeof apiRouter, typeof notFound, typeof errorHandler);

app.use("/uploads", express.static(uploadsDir));
console.log("check:", typeof apiRouter, typeof notFound, typeof errorHandler);

app.use("/api", apiRouter);

// app.use(notFound);
// app.use(errorHandler);

export default app;
