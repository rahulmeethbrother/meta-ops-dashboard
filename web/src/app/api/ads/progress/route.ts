import { NextRequest, NextResponse } from "next/server";
import { callPipeboardTool } from "@/lib/pipeboard-mcp";
import { isMetaOpsAuthorized, META_OPS_COOKIE } from "@/lib/meta-ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decode(result: unknown): Record<string, unknown> {
  const text = (result as { content?: Array<{ text?: string }> })?.content?.[0]?.text;
  if (!text) return (result as Record<string, unknown>) || {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

function statusOf(row: Record<string, unknown>) {
  return String(row.status || row.effective_status || "unknown").toLowerCase();
}

export async function GET(request: NextRequest) {
  if (!isMetaOpsAuthorized(request.cookies.get(META_OPS_COOKIE)?.value)) return NextResponse.json({ error: "Meta Ops password required" }, { status: 401 });
  const accountId = request.nextUrl.searchParams.get("accountId") || "act_1074141625049232";
  try {
    const [campaignResult, adsetResult, adResult] = await Promise.all([
      callPipeboardTool("get_campaigns", { account_id: accountId, limit: 200, status_filter: "all" }),
      callPipeboardTool("get_adsets", { account_id: accountId, limit: 500 }),
      callPipeboardTool("get_ads", { account_id: accountId, limit: 500 }),
    ]);
    const campaigns = Array.isArray(decode(campaignResult).data) ? decode(campaignResult).data as Record<string, unknown>[] : [];
    const adsets = Array.isArray(decode(adsetResult).data) ? decode(adsetResult).data as Record<string, unknown>[] : [];
    const ads = Array.isArray(decode(adResult).data) ? decode(adResult).data as Record<string, unknown>[] : [];
    const progress = campaigns.map((campaign) => {
      const id = String(campaign.id || campaign.campaign_id || "");
      const campaignAdsets = adsets.filter((adset) => String(adset.campaign_id || adset.campaignId || "") === id);
      const adsetIds = new Set(campaignAdsets.map((adset) => String(adset.id || adset.adset_id || "")));
      const campaignAds = ads.filter((ad) => String(ad.campaign_id || ad.campaignId || "") === id || adsetIds.has(String(ad.adset_id || ad.adsetId || "")));
      const count = (rows: Record<string, unknown>[], status: string) => rows.filter((row) => statusOf(row) === status).length;
      return {
        campaignId: id,
        campaignName: String(campaign.name || "Unnamed campaign"),
        campaignStatus: statusOf(campaign),
        adsets: { total: campaignAdsets.length, active: count(campaignAdsets, "active"), paused: count(campaignAdsets, "paused"), inProcess: count(campaignAdsets, "in_process"), issues: count(campaignAdsets, "with_issues") },
        ads: { total: campaignAds.length, active: count(campaignAds, "active"), paused: count(campaignAds, "paused"), inProcess: count(campaignAds, "in_process"), issues: count(campaignAds, "with_issues") },
      };
    });
    return NextResponse.json({ accountId, checkedAt: new Date().toISOString(), progress });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load publishing progress" }, { status: 502 });
  }
}
