import { Router } from "express";
import passport from "passport";
import { setRefreshCookie } from "../lib/cookies";

const router = Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL || "/"}login` }),
  async (req: any, res) => {
    const accessToken = req.user.accessToken as string;
    const refreshToken = req.user.refreshToken as string;

    setRefreshCookie(res, refreshToken);

    const fe = process.env.FRONTEND_URL || "";
    const url = `${fe}/login?token=${encodeURIComponent(accessToken)}`;
    res.redirect(url);
  }
);

export default router;
