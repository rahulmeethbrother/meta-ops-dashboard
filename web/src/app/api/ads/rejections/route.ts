import { NextRequest, NextResponse } from "next/server";
import { isMetaOpsAuthorized, META_OPS_COOKIE } from "@/lib/meta-ops-auth";
import { findRejectedAds, pauseRejectedAds } from "@/lib/meta-rejections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isMetaOpsAuthorized(request.cookies.get(META_OPS_COOKIE)?.value)) {
    return NextResponse.json({ error: "Meta Ops password required" }, { status: 401 });
  }
  try {
    const rejected = await findRejectedAds();
    return NextResponse.json({ rejected, logs: [], checkedAt: new Date().toISOString(), autoAction: "pause" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to inspect rejected ads" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const monitorSecret = process.env.META_MONITOR_SECRET;
  const monitorAuthorized = Boolean(monitorSecret && request.headers.get("x-meta-monitor-secret") === monitorSecret);
  if (!monitorAuthorized && !isMetaOpsAuthorized(request.cookies.get(META_OPS_COOKIE)?.value)) {
    return NextResponse.json({ error: "Meta Ops password required" }, { status: 401 });
  }
  try {
    const logs = await pauseRejectedAds();
    return NextResponse.json({ logs, deleted: [], autoAction: "pause", completedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to run rejection monitor" }, { status: 502 });
  }
}
