import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/server/auth/session";
import { takeToken } from "@/server/security/rate-limit";
import { sanitizeEmail } from "@/shared/security/sanitize";
import {
  createSession,
  deleteUserById,
  ensureUserDataExpiry,
  findUserByEmail,
  isUserDataExpired,
  verifyPassword,
} from "@/server/services/auth.service";

const SESSION_DAYS = 30;

const loginSchema = z.object({
  email: z.string().max(254, "Email is too long."),
  password: z.string().min(8, "Password is required.").max(128, "Password is too long."),
});

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, error: message, message }, { status, headers });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = takeToken(`login:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    return jsonError("Too many login attempts. Please try again shortly.", 429, {
      "Retry-After": Math.ceil(rate.retryAfter / 1000).toString(),
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input.");
  }

  const email = sanitizeEmail(parsed.data.email);
  if (!email) return jsonError("Enter a valid email address.");

  const password = parsed.data.password;

  const user = await findUserByEmail(email);
  if (!user) {
    return jsonError("Invalid credentials.", 401);
  }

  const { id, email: userEmail, name, password_hash, data_expires_at } = user as any;

  if (isUserDataExpired(data_expires_at)) {
    await deleteUserById(id);
    return jsonError("Account data expired. Please register again.", 410);
  }

  const passwordOk = typeof password_hash === "string" ? await verifyPassword(password, password_hash) : false;
  if (!passwordOk) {
    return jsonError("Invalid credentials.", 401);
  }

  if (!data_expires_at) {
    await ensureUserDataExpiry(id);
  }

  const { sessionId, expiresAt } = await createSession({ userId: id, days: SESSION_DAYS });
  setSessionCookie(sessionId, expiresAt);

  return NextResponse.json({ ok: true, user: { id, email: userEmail, name } });
}
