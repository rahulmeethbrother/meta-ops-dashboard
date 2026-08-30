import { NextRequest, NextResponse } from "next/server";
import { isMetaOpsAuthorized, META_OPS_COOKIE, metaOpsToken } from "@/lib/meta-ops-auth";

export async function POST(request: NextRequest) {
  const secret = process.env.META_OPS_PASSWORD;
  if (!secret) return NextResponse.json({ error: "META_OPS_PASSWORD is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const supplied = typeof body.password === "string" ? body.password : "";
  if (supplied !== secret) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(META_OPS_COOKIE, metaOpsToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authorized: isMetaOpsAuthorized(request.cookies.get(META_OPS_COOKIE)?.value) });
}
