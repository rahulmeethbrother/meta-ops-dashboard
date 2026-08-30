// Admin-only credential management.
//
//   GET    /api/admin/credentials        -> catalog with configured flags ONLY
//   PUT    /api/admin/credentials        -> { id, value } write to Secret Manager
//   DELETE /api/admin/credentials?id=... -> remove a credential
//
// Secret values are write-only: they go straight to Google Secret Manager and
// are NEVER echoed back in any response -- not even to the admin who saved
// them. requireAdmin() enforces the role on the server for every verb.

import { NextRequest, NextResponse } from "next/server";
import { errorResponse, HttpError, requireAdmin } from "@/lib/server-auth";
import {
  deleteCredential,
  isValidCredentialId,
  listCredentialStatuses,
  setCredential,
} from "@/lib/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const credentials = await listCredentialStatuses();
    return NextResponse.json({ credentials });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "");
    const value = String(body.value ?? "");

    if (!isValidCredentialId(id)) throw new HttpError(400, "Unknown credential id");
    if (!value.trim()) throw new HttpError(400, "Value must not be empty");
    if (value.length > 4096) throw new HttpError(400, "Value too long");

    await setCredential(id, value, admin.email);
    return NextResponse.json({ ok: true, id, configured: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!isValidCredentialId(id)) throw new HttpError(400, "Unknown credential id");

    await deleteCredential(id, admin.email);
    return NextResponse.json({ ok: true, id, configured: false });
  } catch (err) {
    return errorResponse(err);
  }
}
