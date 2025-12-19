import { NextResponse } from "next/server";
import { purgeExpiredUsers } from "@/server/services/auth.service";

const CRON_SECRET = process.env.CRON_SECRET;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (token !== CRON_SECRET) {
      return unauthorized();
    }
  }

  const deleted = await purgeExpiredUsers();
  return NextResponse.json({ ok: true, deleted });
}
