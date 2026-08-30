import { NextRequest, NextResponse } from "next/server";
import { isMetaOpsAuthorized, META_OPS_COOKIE } from "@/lib/meta-ops-auth";
import { findRejectedAds } from "@/lib/meta-rejections";

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
