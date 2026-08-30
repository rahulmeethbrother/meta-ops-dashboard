// Stream a finished Company Studio output through the authenticated web app.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";
import { studioGatewayFetch } from "@/lib/company-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string; index: string }> },
) {
  try {
    const user = await requireUser(req);
    const { jobId, index } = await ctx.params;
    const outputIndex = Number(index);
    if (!Number.isInteger(outputIndex) || outputIndex < 1 || outputIndex > 20) {
      throw new HttpError(400, "Invalid output.");
    }

    const snapshot = await db().collection("studioJobs").doc(jobId).get();
    if (!snapshot.exists) throw new HttpError(404, "Studio job not found.");
    const record = snapshot.data()!;
    if (record.uid !== user.uid && user.role !== "admin") throw new HttpError(403, "Not your studio job.");

    const response = await studioGatewayFetch(
      `/v1/jobs/${encodeURIComponent(record.gatewayJobId)}/outputs/${outputIndex}`,
      { headers: { Accept: "*/*" } },
    );
    if (!response.ok) {
      throw new HttpError(response.status === 409 ? 409 : 502, "This output is not ready yet.");
    }

    const extension = record.mediaType === "video" ? "mp4" : "png";
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? (record.mediaType === "video" ? "video/mp4" : "image/png"),
        "Content-Disposition": `attachment; filename="company-studio-${jobId.slice(0, 8)}-${outputIndex}.${extension}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
