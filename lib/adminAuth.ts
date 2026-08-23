import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "gabo_admin";

function expectedToken() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const serverSecret = process.env.SUPABASE_SECRET_KEY;
  if (!sessionSecret || !serverSecret) return null;

  const signingKey = crypto
    .createHash("sha256")
    .update(`${sessionSecret}:${serverSecret}:gabo-admin-v2`)
    .digest();

  return crypto
    .createHmac("sha256", signingKey)
    .update("gabo-50-admin")
    .digest("hex");
}

export async function isAdmin() {
  const token = expectedToken();
  if (!token) return false;
  const store = await cookies();
  const current = store.get(COOKIE)?.value;
  if (!current || current.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(current), Buffer.from(token));
}

export function adminCookieValue() {
  return expectedToken();
}

export const adminCookieName = COOKIE;
