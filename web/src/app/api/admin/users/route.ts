// Admin-only user management.
//   GET  /api/admin/users            -> list users with roles
//   POST /api/admin/users            -> { email, role } set a user's role
//
// Roles are Firebase Auth custom claims; the claim is the single source of
// truth checked by requireUser()/requireAdmin() and by Firestore rules.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const result = await adminAuth().listUsers(1000);
    const users = result.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      role: (u.customClaims?.role as string) === "admin" ? "admin" : "user",
      disabled: u.disabled,
      createdAt: u.metadata.creationTime,
      lastSignIn: u.metadata.lastSignInTime,
    }));
    return NextResponse.json({ users });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "user";
    if (!email) throw new HttpError(400, "email is required");

    const target = await adminAuth()
      .getUserByEmail(email)
      .catch(() => null);
    if (!target) throw new HttpError(404, `No user with email ${email}`);
    if (target.uid === admin.uid && role !== "admin") {
      throw new HttpError(400, "You cannot remove your own admin role");
    }

    await adminAuth().setCustomUserClaims(target.uid, { role });
    // Force token refresh so the change takes effect on next request.
    await adminAuth().revokeRefreshTokens(target.uid);

    await db().collection("users").doc(target.uid).set(
      {
        email,
        role,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.email,
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, uid: target.uid, role });
  } catch (err) {
    return errorResponse(err);
  }
}
