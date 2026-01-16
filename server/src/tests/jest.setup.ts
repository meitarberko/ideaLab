import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.test" });

process.env.JWT_ACCESS_SECRET ||= "test-access-secret";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret";
process.env.ACCESS_TOKEN_TTL ||= "60m";
process.env.REFRESH_TOKEN_TTL_DAYS ||= "14";
process.env.GEMINI_API_KEY ||= "test-gemini-key";
process.env.PUBLIC_BASE_URL ||= "http://localhost:3001";
process.env.FRONTEND_URL ||= "http://localhost:5173";
process.env.UPLOADS_DIR ||= path.join(process.cwd(), "src/tests/.tmp/uploads");

jest.mock("passport", () => {
  const authenticate = (_strategy: string, options: any) => {
    return (req: any, res: any, next: any) => {
      if (req.path?.endsWith("/google")) {
        return res.redirect(302, "/oauth/google");
      }
      if (options?.failureRedirect && req.query?.fail === "1") {
        return res.redirect(options.failureRedirect);
      }
      req.user = { accessToken: "test-access", refreshToken: "test-refresh" };
      return next();
    };
  };

  return { __esModule: true, default: { authenticate } };
});

jest.setTimeout(20000);

