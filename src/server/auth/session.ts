/**
 * Manage session cookies and retrieval of the current user.
 */
import { cookies } from "next/headers";
import { getSessionByRawToken } from "@/server/services/auth.service";

export const SESSION_COOKIE = "bm_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * Reads the current session from the cookie and validates it against the DB.
 * Returns null if missing/expired/invalid instead of throwing to keep callers simple.
 */
export async function getServerSession(): Promise<null | { user: SessionUser; expiresAt: string }> {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await getSessionByRawToken(token);
    if (!session) return null;

    return { user: session.user, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

/**
 * Helper for API routes to get the user id (or null).
 */
export async function getSessionUserId() {
  const session = await getServerSession();
  return session?.user.id ?? null;
}

/**
 * Issue a new session cookie with consistent security flags.
 */
export function setSessionCookie(sessionId: string, expiresAt: string) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

  cookies().set({
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
