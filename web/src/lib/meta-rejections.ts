import "server-only";
import { callPipeboardTool } from "@/lib/pipeboard-mcp";

export interface RejectedAd {
  adId: string;
  adName: string;
  adsetId?: string;
  campaignId?: string;
  accountId: string;
  status: string;
  issue: string;
  detectedAt: string;
}

function decode(result: unknown): Record<string, unknown> {
  const text = (result as { content?: Array<{ text?: string }> })?.content?.[0]?.text;
  if (!text) return (result as Record<string, unknown>) || {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

function issueText(ad: Record<string, unknown>) {
  const issue = ad.issues_info || ad.issues || ad.rejection_reason || ad.error;
  if (typeof issue === "string") return issue;
  if (issue) return JSON.stringify(issue);
  return "Meta reported an issue with this ad";
}

export async function findRejectedAds() {
  const accounts = decode(await callPipeboardTool("get_ad_accounts", { user_id: "me", limit: 200 }));
  const rows = Array.isArray(accounts.data) ? accounts.data : [];
  const results = await Promise.all(rows.map(async (account) => {
    const rawId = String((account as Record<string, unknown>).id || (account as Record<string, unknown>).account_id || "");
    const accountId = rawId.startsWith("act_") ? rawId : `act_${rawId}`;
    try {
      const ads = decode(await callPipeboardTool("get_ads", { account_id: accountId, limit: 200 }));
      return (Array.isArray(ads.data) ? ads.data : [])
        .filter((ad: Record<string, unknown>) => {
          const status = String(ad.status || ad.effective_status || "").toLowerCase();
          return Boolean(ad.issues_info || ad.issues || ad.rejection_reason || status.includes("reject") || status.includes("disapprov"));
        })
        .map((ad: Record<string, unknown>) => ({
          adId: String(ad.id || ad.ad_id || ""),
          adName: String(ad.name || ad.ad_name || "Unnamed ad"),
          adsetId: ad.adset_id ? String(ad.adset_id) : undefined,
          campaignId: ad.campaign_id ? String(ad.campaign_id) : undefined,
          accountId,
          status: String(ad.status || ad.effective_status || "unknown"),
          issue: issueText(ad),
          detectedAt: new Date().toISOString(),
        }));
    } catch { return []; }
  }));
  return results.flat().filter((ad) => !["paused", "archived", "deleted"].includes(ad.status.toLowerCase()));
}

export async function pauseRejectedAds() {
  const rejected = await findRejectedAds();
  const logs = await Promise.all(rejected.map(async (ad) => {
    try {
      await callPipeboardTool("update_ad", { ad_id: ad.adId, status: "PAUSED" });
      return { ...ad, action: "paused", actionAt: new Date().toISOString() };
    } catch (error) {
      return { ...ad, action: "failed", actionAt: new Date().toISOString(), actionError: error instanceof Error ? error.message : "Pause failed" };
    }
  }));
  return logs;
}
