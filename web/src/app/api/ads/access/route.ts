import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "meta_ops_access";

function token(secret: string) {
  return createHmac("sha256", secret).update("meta-ops-access").digest("base64url");
}

export async function POST(request: NextRequest) {
  const secret = process.env.META_OPS_PASSWORD;
  if (!secret) return NextResponse.json({ error: "META_OPS_PASSWORD is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const supplied = typeof body.password === "string" ? body.password : "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
