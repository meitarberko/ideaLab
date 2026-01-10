import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";

function formatZod(error: ZodError) {
  return error.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message
  }));
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const normalized = Object.fromEntries(
      Object.entries(req.body || {}).map(([k, v]) => [
        k.trim(),
        typeof v === "string" ? v.trim() : v
      ])
    );

    const parsed = schema.safeParse(normalized);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZod(parsed.error) });
    }

    (req as any).validatedBody = parsed.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZod(parsed.error) });
    }

    (req as any).validatedParams = parsed.data;
    next();
  };
}
