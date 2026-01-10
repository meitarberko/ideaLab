import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/tokens";

export interface AuthedRequest extends Request {
  user?: { userId: string; username: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  const token = auth.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    (req as AuthedRequest).user = { userId: payload.userId, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
