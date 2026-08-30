// GET /api/jobs/:jobId -- job + items (owner or admin only).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireUser(req);
    const { jobId } = await ctx.params;

    const jobSnap = await db().collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) throw new HttpError(404, "Job not found");
    const job = jobSnap.data()!;
    if (job.uid !== user.uid && user.role !== "admin") {
      throw new HttpError(403, "Not your job");
    }

    const itemsSnap = await jobSnap.ref.collection("items").orderBy("index").get();
    const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ job: { id: jobSnap.id, ...job }, items });
  } catch (err) {
    return errorResponse(err);
  }
}
