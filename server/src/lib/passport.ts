import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken, hashToken } from "./tokens";

export function setupPassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "";

  passport.use(
    new GoogleStrategy(
      { clientID, clientSecret, callbackURL },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value || `${googleId}@google.local`;
          const username = (profile.displayName || email.split("@")[0]).replace(/\s+/g, "").slice(0, 24) || `user${googleId.slice(0, 6)}`;

          let user = await User.findOne({ googleId });
          if (!user) {
            const taken = await User.findOne({ username }).lean();
            const finalUsername = taken ? `${username}${Math.floor(Math.random() * 999)}` : username;
            user = await User.create({
              username: finalUsername,
              email,
              provider: "google",
              googleId,
              avatarUrl: profile.photos?.[0]?.value
            });
          }

          const payload = { userId: String(user._id), username: user.username };
          const newAccess = signAccessToken(payload);
          const newRefresh = signRefreshToken(payload);

          user.refreshTokenHashes = [hashToken(newRefresh), ...user.refreshTokenHashes].slice(0, 10);
          await user.save();

          (done as any)(null, { accessToken: newAccess, refreshToken: newRefresh, user });
        } catch (e) {
          done(e as any);
        }
      }
    )
  );
}
