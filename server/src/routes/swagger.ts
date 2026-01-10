import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../swagger";

const router = Router();
router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
export default router;
