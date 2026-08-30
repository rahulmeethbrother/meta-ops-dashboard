// Company Studio job creation. Provider credentials stay in server-only env.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { errorResponse, requireUser } from "@/lib/server-auth";
import { sanitizeStudioRequest, studioGatewayJson } from "@/lib/company-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GatewayCreateResponse {
  job_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const request = sanitizeStudioRequest(await req.json().catch(() => ({})));
    const gateway = await studioGatewayJson<GatewayCreateResponse>("/v1/jobs", {
      method: "POST",
      body: JSON.stringify(request),
    });
    if (!gateway.job_id) throw new Error("Missing Company Studio job id");

    const jobRef = db().collection("studioJobs").doc();
    await jobRef.set({
      uid: user.uid,
      email: user.email,
      gatewayJobId: gateway.job_id,
      mediaType: request.media_type,
      mode: request.mode,
      count: request.count,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ jobId: jobRef.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
