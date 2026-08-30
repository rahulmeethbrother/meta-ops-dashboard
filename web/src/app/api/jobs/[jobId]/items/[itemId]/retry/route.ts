// POST /api/jobs/:jobId/items/:itemId/retry -- re-queue a failed/cancelled item.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";
import { enforceRateLimits } from "@/lib/rate-limit";
import { enqueueRenderTask } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string; itemId: string }> },
) {
  try {
    const user = await requireUser(req);
    const { jobId, itemId } = await ctx.params;

    const itemRef = db().collection("jobs").doc(jobId).collection("items").doc(itemId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) throw new HttpError(404, "Item not found");
    const item = itemSnap.data()!;
    if (item.uid !== user.uid && user.role !== "admin") {
      throw new HttpError(403, "Not your item");
    }
    if (!["failed", "cancelled"].includes(item.status)) {
      throw new HttpError(409, `Item is ${item.status}; only failed or cancelled items can be retried`);
    }

    await enforceRateLimits(user.uid, 1);

    await itemRef.set(
      {
        status: "queued",
        progress: 0,
        attempts: 0,
        cancelRequested: false,
        error: FieldValue.delete(),
        failed_stage: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await db()
      .collection("jobs")
      .doc(jobId)
      .set({ status: "processing", updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await enqueueRenderTask(jobId, itemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
