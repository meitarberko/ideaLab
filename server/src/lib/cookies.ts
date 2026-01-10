import { Response } from "express";

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/api/auth/refresh"
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
}
