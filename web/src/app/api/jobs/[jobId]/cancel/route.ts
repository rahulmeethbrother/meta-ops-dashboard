// POST /api/jobs/:jobId/cancel -- cancel all pending items of a job.
//
// Queued items flip to "cancelled" immediately; the renderer also skips them
// if a Cloud Task is already in flight. Items currently rendering get
// cancelRequested=true and abort at the next pipeline stage boundary.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireUser(req);
    const { jobId } = await ctx.params;

    const jobRef = db().collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) throw new HttpError(404, "Job not found");
    const job = jobSnap.data()!;
    if (job.uid !== user.uid && user.role !== "admin") {
      throw new HttpError(403, "Not your job");
    }

    const itemsSnap = await jobRef.collection("items").get();
    const batch = db().batch();
    let cancelled = 0;
    let flagged = 0;

    itemsSnap.docs.forEach((doc) => {
      const status = doc.data().status;
      if (status === "queued") {
        batch.set(
          doc.ref,
          {
            status: "cancelled",
            cancelRequested: true,
            finishedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        cancelled += 1;
      } else if (status === "processing") {
        batch.set(
          doc.ref,
          { cancelRequested: true, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
        flagged += 1;
      }
    });

    batch.set(jobRef, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

    return NextResponse.json({ cancelled, cancelRequested: flagged });
  } catch (err) {
    return errorResponse(err);
  }
}
