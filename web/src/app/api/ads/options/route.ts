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

function accountId(value: unknown) {
  const raw = String(value || "");
  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

export async function GET(request: NextRequest) {
  if (!isMetaOpsAuthorized(request.cookies.get(META_OPS_COOKIE)?.value)) {
    return NextResponse.json({ error: "Meta Ops password required" }, { status: 401 });
  }
  try {
    const accounts = decode(await callPipeboardTool("get_ad_accounts", { user_id: "me", limit: 200 }));
    const accountRows = Array.isArray(accounts.data) ? accounts.data : [];
    const selected = request.nextUrl.searchParams.get("accountId");
    const pages = selected ? decode(await callPipeboardTool("get_account_pages", { account_id: accountId(selected) })) : {};
    return NextResponse.json({
      accounts: accountRows.map((account: Record<string, unknown>) => ({
        id: accountId(account.id || account.account_id),
        name: String(account.name || account.id || "Meta account"),
        status: account.account_status,
        logo: account.picture_url || account.profile_picture_url || null,
      })),
      pages: (Array.isArray(pages.data) ? pages.data : []).map((page: Record<string, unknown>) => ({
        id: String(page.id || ""),
        name: String(page.name || page.id || "Facebook Page"),
        logo: page.picture_url || page.profile_picture_url || page.image || null,
      })).filter((page: { id: string }) => page.id),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Meta options" }, { status: 502 });
  }
}
