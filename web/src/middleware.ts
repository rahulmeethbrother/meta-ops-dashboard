import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "meta_ops_access";

function base64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("meta-ops-access")));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/ads/access" || pathname === "/api/ads/access") return NextResponse.next();

  const secret = process.env.META_OPS_PASSWORD;
  const expected = secret ? await accessToken(secret) : "";
  if (expected && request.cookies.get(COOKIE_NAME)?.value === expected) return NextResponse.next();

  if (pathname.startsWith("/api/ads/")) {
    return NextResponse.json({ error: "Meta Ops password required" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/ads/access";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/ads/:path*", "/api/ads/:path*"],
};
