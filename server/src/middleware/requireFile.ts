import { Request, Response, NextFunction } from "express";

export function requireFile(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        message: "Validation error",
        errors: [{ field: fieldName, message: `${fieldName} is required` }]
      });
    }
    next();
  };
}