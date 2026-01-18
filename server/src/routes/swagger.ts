import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../swagger";

const router = Router();
router.get("/json", (_req, res) => {
  res.json(swaggerSpec);
});
router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
export default router;
