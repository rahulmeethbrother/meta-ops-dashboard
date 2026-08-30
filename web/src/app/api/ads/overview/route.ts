import { NextRequest, NextResponse } from "next/server";
import { DEMO_META_OVERVIEW } from "@/lib/meta-dashboard";
import { callPipeboardTool } from "@/lib/pipeboard-mcp";
import { isMetaOpsAuthorized, META_OPS_COOKIE } from "@/lib/meta-ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isMetaOpsAuthorized(request.cookies.get(META_OPS_COOKIE)?.value)) {
    return NextResponse.json({ error: "Meta Ops password required" }, { status: 401 });
  }
  if (!process.env.PIPEBOARD_MCP_TOKEN) {
    return NextResponse.json({
      ...DEMO_META_OVERVIEW,
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const accountsResult = await callPipeboardTool("get_ad_accounts", {
      user_id: "me",
      limit: 200,
    });
    const rawAccounts = (accountsResult as { content?: Array<{ text?: string }> })?.content?.[0]?.text;
    const accounts = rawAccounts ? JSON.parse(rawAccounts) : accountsResult;
    const accountRows = Array.isArray(accounts?.data) ? accounts.data : [];
    const metrics = await Promise.all(accountRows.map(async (account: Record<string, unknown>) => {
      const rawId = String(account.id || account.account_id || "");
      const accountId = rawId.startsWith("act_") ? rawId : `act_${rawId}`;
      try {
        const result = await callPipeboardTool("get_insights", {
          object_id: accountId,
          time_range: "today",
          level: "account",
          limit: 25,
        });
        const text = (result as { content?: Array<{ text?: string }> })?.content?.[0]?.text;
        const row = text ? (JSON.parse(text)?.data?.[0] ?? {}) : {};
        const action = (row.actions ?? []).find((item: Record<string, unknown>) =>
          item.action_type === "omni_landing_page_view" || item.action_type === "landing_page_view",
        );
        const spend = Number(row.spend || 0);
        const impressions = Number(row.impressions || 0);
        const clicks = Number(row.clicks || 0);
        const lpvs = Number(action?.value || 0);
        return {
          accountId,
          name: String(account.name || row.account_name || accountId),
          status: account.account_status === 1 ? "active" : "disabled",
          spend,
          impressions,
          clicks,
          lpvs,
          cpm: impressions ? (spend / impressions) * 1000 : 0,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          cpc: clicks ? spend / clicks : 0,
          costPerLpv: lpvs ? spend / lpvs : 0,
          rejectedAds: 0,
          activeCampaigns: 0,
          dailyBudget: 0,
        };
      } catch {
        return {
          accountId,
          name: String(account.name || accountId),
          status: "disabled" as const,
          spend: 0,
          impressions: 0,
          clicks: 0,
          lpvs: 0,
          cpm: 0,
          ctr: 0,
          cpc: 0,
          costPerLpv: 0,
          rejectedAds: 0,
          activeCampaigns: 0,
          dailyBudget: 0,
        };
      }
    }));
    return NextResponse.json({
      demo: false,
      source: "mcp-bridge",
      fetchedAt: new Date().toISOString(),
      timezone: "UTC",
      accounts: metrics,
    });
  } catch (error) {
    return NextResponse.json({
      ...DEMO_META_OVERVIEW,
      source: "demo",
      bridgeError: error instanceof Error ? error.message : "Pipeboard MCP request failed",
      fetchedAt: new Date().toISOString(),
    });
  }
}
