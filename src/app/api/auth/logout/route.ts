import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { withNoStore } from "@/lib/http";

/** A cached "logged out" response would keep the user signed out; a cached 200 would log them out. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true }, withNoStore());
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(req), maxAge: 0 });
  return res;
}
