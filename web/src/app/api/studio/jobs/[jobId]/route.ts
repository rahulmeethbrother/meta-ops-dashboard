// Company Studio status. The Firestore mapping enforces per-user ownership.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";
import { studioGatewayJson } from "@/lib/company-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GatewayStatus {
  job_id: string;
  status: string;
  media_type: "image" | "video";
  count: number;
  outputs: Array<{ index: number; status: string; content_type?: string }>;
  errors?: Array<{ index?: number; message?: string }>;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireUser(req);
    const { jobId } = await ctx.params;
    const snapshot = await db().collection("studioJobs").doc(jobId).get();
    if (!snapshot.exists) throw new HttpError(404, "Studio job not found.");
    const record = snapshot.data()!;
    if (record.uid !== user.uid && user.role !== "admin") throw new HttpError(403, "Not your studio job.");

    const gateway = await studioGatewayJson<GatewayStatus>(`/v1/jobs/${encodeURIComponent(record.gatewayJobId)}`);
    return NextResponse.json({
      job: {
        id: jobId,
        status: gateway.status,
        media_type: gateway.media_type,
        count: gateway.count,
        outputs: gateway.outputs,
        errors: gateway.errors ?? [],
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
