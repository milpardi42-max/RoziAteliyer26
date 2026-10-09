import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContentWithEtag, resetContent, saveContent } from "@/lib/data/store";
import type { SiteContent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Admin content API. Admin authentication is normally required; the temporary
 * ADMIN_LOGIN_DISABLED mode intentionally makes it public until that flag is turned off.
 * Every answer remains private + no-store so a shared/edge cache cannot expose mutable admin data.
 */
async function requireAdmin() {
  const user = await getAdminSession();
  return user?.role === "admin" ? user : null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  const [content, etag] = await getContentWithEtag();
  const res = NextResponse.json(content, withNoStore());
  if (etag) res.headers.set("ETag", `"${etag}"`);
  return res;
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return unauthorized();
  const body = (await req.json().catch(() => null)) as SiteContent | null;
  if (!body || !Array.isArray(body.patterns) || !Array.isArray(body.products)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  // Optional optimistic locking: If-Match header
  const ifMatch = req.headers.get("If-Match");
  const expectedEtag = ifMatch ? ifMatch.replace(/^"|"$/g, "") : undefined;

  try {
    await saveContent(body, expectedEtag);
  } catch (e) {
    if (e instanceof Error && e.message === "etag_conflict") {
      return NextResponse.json({ ok: false, error: "etag_conflict" }, withNoStore({ status: 409 }));
    }
    console.error("[admin/content] storage write failed:", e);
    return NextResponse.json({ ok: false, error: "storage_write_failed" }, withNoStore({ status: 502 }));
  }
  return NextResponse.json({ ok: true }, withNoStore());
}

export async function DELETE() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    await resetContent();
  } catch (e) {
    console.error("[admin/content] storage reset failed:", e);
    return NextResponse.json({ ok: false, error: "storage_reset_failed" }, withNoStore({ status: 502 }));
  }
  return NextResponse.json({ ok: true }, withNoStore());
}
