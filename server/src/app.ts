import "dotenv/config";
import express from "express";
import path from "path";
import apiRouter from "./routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/errorHandler";
import { optionalAuth } from "./middleware/optionalAuth";
import cookieParser from "cookie-parser";
import passport from "passport";
import cors from "cors";
import { setupPassport } from "./lib/passport";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

const app = express();
const distPath = path.join(__dirname, "../../client/dist");
const apiBase = process.env.VITE_API_BASE?.trim();
const serverPublicUrl = apiBase?.replace(/\/api\/?$/, "");
const allowedOrigins = serverPublicUrl ? [serverPublicUrl] : [];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(express.static(distPath));

console.log("check:", typeof apiRouter, typeof notFound, typeof errorHandler);


setupPassport();
app.use(passport.initialize());

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IdeaLab API",
      version: "1.0.0"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ bearerAuth: [] }],
    ...(serverPublicUrl ? { servers: [{ url: serverPublicUrl }] } : {})
  },
  apis: ["./src/routes/**/*.ts"]
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

app.use("/uploads", express.static(uploadsDir));

app.use("/api", apiRouter);

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

export default app;
