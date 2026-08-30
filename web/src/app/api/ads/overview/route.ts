import { NextResponse } from "next/server";
import { DEMO_META_OVERVIEW } from "@/lib/meta-dashboard";
import { callPipeboardTool } from "@/lib/pipeboard-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.PIPEBOARD_MCP_TOKEN) {
    return NextResponse.json({
      ...DEMO_META_OVERVIEW,
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const accountsResult = await callPipeboardTool("mcp_meta_ads_get_ad_accounts", {
      user_id: "me",
      limit: 200,
    });
    const rawAccounts = (accountsResult as { content?: Array<{ text?: string }> })?.content?.[0]?.text;
    const accounts = rawAccounts ? JSON.parse(rawAccounts) : accountsResult;
    return NextResponse.json({
      demo: false,
      source: "mcp-bridge",
      fetchedAt: new Date().toISOString(),
      timezone: "UTC",
      accounts: Array.isArray(accounts?.data)
        ? accounts.data.map((account: Record<string, unknown>) => ({
            accountId: String(account.id || account.account_id || ""),
            name: String(account.name || account.id || "Meta account"),
            status: account.account_status === 1 ? "active" : "disabled",
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
          }))
        : [],
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
