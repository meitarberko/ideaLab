import { Request, Response, NextFunction } from "express";

function isMultipartError(err: any) {
  const message = typeof err?.message === "string" ? err.message : "";
  return (
    err?.name === "MulterError" ||
    message.includes("Multipart") ||
    message.toLowerCase().includes("boundary") ||
    message.toLowerCase().includes("form")
  );
}

export default function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);

  if (isMultipartError(err)) {
    return res.status(400).json({
      message: "Invalid multipart form data",
      hint: "Send multipart/form-data with fields: text (string) and image (file)."
    });
  }

  const status = Number(err?.status || err?.statusCode) || 500;
  const message = status >= 500 ? "Internal server error" : err?.message || "Request failed";
  return res.status(status).json({ message });
}
