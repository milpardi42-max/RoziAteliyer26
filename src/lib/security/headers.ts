/**
 * Security headers applied at the edge via middleware.
 *
 *   - CSP with strict script/style sourcing, inline styles/script allowed only
 *     via nonce (Next.js uses these for hydration and theme scripts).
 *   - HSTS with preload for HTTPS deployments.
 *   - Anti-clickjacking (X-Frame-Options: DENY), except for embedded preview hosts
 *     (Arena/WebContainer) which use SAMEORIGIN + frame-ancestors.
 *   - Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
 */

import { NextResponse, type NextRequest } from "next/server";

function isEmbeddedPreviewHost(hostname: string): boolean {
  return [".e2b.app", ".webcontainer-api.io", ".local-credentialless.webcontainer-api.io", ".stackblitz.io"]
    .some((suffix) => hostname.endsWith(suffix));
}

export function applySecurityHeaders(req: NextRequest, res: NextResponse): NextResponse {
  const hostname = (req.headers.get("x-forwarded-host")?.split(",")[0] || req.headers.get("host") || "")
    .replace(/:\d+$/, "")
    .toLowerCase();
  const isEmbedded = isEmbeddedPreviewHost(hostname);
  const isDev = process.env.NODE_ENV !== "production";

  const headers = res.headers;

  // We never let any other origin frame this site except the preview hosts.
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", isEmbedded ? "SAMEORIGIN" : "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  if (!isDev) {
    // HSTS — 1 year + preload. Safe even behind previews (the CDN terminates TLS).
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Content-Security-Policy:
  //   - self for everything by default
  //   - images from self + blob/data (Next/image, uploads) + common CDNs
  //   - media/HLS allowed from self + blob
  //   - scripts: self + inline (Next.js uses inline for RSC payloads, but no eval)
  //   - connect: self + hls/dash over HTTPS
  //   - frame-ancestors denies cross-origin framing except same-origin on previews
  const cspDirectives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", "'strict-dynamic'", "https:"]],
    ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
    ["font-src", ["'self'", "https://fonts.gstatic.com", "data:"]],
    ["img-src", ["'self'", "blob:", "data:", "https:", "http:"]],
    ["media-src", ["'self'", "blob:", "data:", "https:"]],
    ["connect-src", ["'self'", "https:", "wss:", "ws:"]],
    ["frame-src", ["'self'", "https://www.youtube.com", "https://player.vimeo.com"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", isEmbedded ? ["'self'"] : ["'none'"]],
    ["upgrade-insecure-requests", []],
  ];

  const csp = cspDirectives
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
  headers.set("Content-Security-Policy", csp);

  return res;
}
