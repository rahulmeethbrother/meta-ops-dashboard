import { NextResponse } from "next/server";
import { DEMO_META_OVERVIEW } from "@/lib/meta-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // This endpoint is public because it serves demo data only.
  return NextResponse.json({
    ...DEMO_META_OVERVIEW,
    fetchedAt: new Date().toISOString(),
  });
}
