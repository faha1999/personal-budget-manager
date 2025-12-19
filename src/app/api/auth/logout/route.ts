import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, SESSION_COOKIE } from "@/server/auth/session";
import { deleteSessionByRawToken } from "@/server/services/auth.service";

export async function POST() {
  try {
    const sessionId = cookies().get(SESSION_COOKIE)?.value;

    if (sessionId) {
      await deleteSessionByRawToken(sessionId);
    }

    clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to logout." }, { status: 500 });
  }
}
