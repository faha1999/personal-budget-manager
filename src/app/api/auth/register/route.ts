import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/server/auth/session";
import { takeToken } from "@/server/security/rate-limit";
import { sanitizeEmail, sanitizeText } from "@/shared/security/sanitize";
import { createSession, createUser } from "@/server/services/auth.service";

const SESSION_DAYS = 30;

const registerSchema = z.object({
  email: z.string().max(254, "Email is too long."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long.")
    .regex(/(?=.*[A-Za-z])(?=.*\d)/, "Use letters and numbers for a stronger password."),
  name: z.string().max(120, "Name is too long.").optional().nullable(),
});

function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, error: message, message }, { status, headers });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = takeToken(`register:${ip}`, 8, 60_000);
  if (!rate.allowed) {
    return jsonError("Too many sign-up attempts. Please try again shortly.", 429, {
      "Retry-After": Math.ceil(rate.retryAfter / 1000).toString(),
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input.");
  }

  const email = sanitizeEmail(parsed.data.email);
  if (!email) return jsonError("Enter a valid email address.");

  const name = parsed.data.name ? sanitizeText(parsed.data.name, { maxLength: 120 }) : null;
  const password = parsed.data.password;

  try {
    const userId = await createUser({ email, name, password });
    const { sessionId, expiresAt } = await createSession({ userId, days: SESSION_DAYS });
    setSessionCookie(sessionId, expiresAt);

    return NextResponse.json({ ok: true, user: { id: userId, email, name } }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Error && err.message.includes("already registered")) {
      return jsonError("Email already in use.", 409);
    }
    return jsonError("Failed to register.", 500);
  }
}
