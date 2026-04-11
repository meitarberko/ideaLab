import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/tokens";
import { AuthedRequest } from "./requireAuth";

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = auth.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    (req as AuthedRequest).user = { userId: payload.userId, username: payload.username };
  } catch {
    // Ignore invalid tokens on public routes. Protected routes still use requireAuth.
  }

  next();
}
