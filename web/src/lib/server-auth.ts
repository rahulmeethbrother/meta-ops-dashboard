// Server-side authentication + role enforcement.
//
// EVERY protected API route calls requireUser()/requireAdmin() first. Roles
// live in Firebase Auth custom claims ({ role: "admin" | "user" }) which are
// cryptographically bound to the ID token -- the client cannot forge them,
// and hiding admin UI is never the security boundary.

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";
import type { Role } from "./types";

export interface AuthedUser {
  uid: string;
  email: string;
  role: Role;
  token: DecodedIdToken;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new HttpError(401, "Missing Authorization: Bearer <idToken>");

  let token: DecodedIdToken;
  try {
    // checkRevoked=true so disabling a user takes effect immediately.
    token = await adminAuth().verifyIdToken(match[1], true);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  const role: Role = token.role === "admin" ? "admin" : "user";
  return { uid: token.uid, email: token.email ?? "", role, token };
}

export async function requireAdmin(req: NextRequest): Promise<AuthedUser> {
  const user = await requireUser(req);
  if (user.role !== "admin") throw new HttpError(403, "Admin role required");
  return user;
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
