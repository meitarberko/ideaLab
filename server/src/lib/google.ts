import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID || "";
const oauthClient = clientId ? new OAuth2Client(clientId) : null;

export type GoogleIdTokenPayload = {
  googleId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
  if (!clientId || !oauthClient) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: clientId
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      throw new Error("Invalid Google ID token payload");
    }

    return {
      googleId: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || null
    };
  } catch {
    throw new Error("Invalid Google ID token");
  }
}
