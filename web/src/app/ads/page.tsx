"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MetaOverview } from "@/lib/meta-dashboard";

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string) {
  return status === "active" ? "Active" : status === "disabled" ? "Disabled" : "Unsettled";
}

function AdsDashboard() {
  const [overview, setOverview] = useState<MetaOverview | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError("");
    try {
       const response = await fetch("/api/ads/overview", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      setOverview((await response.json()) as MetaOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load metrics");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const accounts = overview?.accounts ?? [];
    return accounts.reduce(
      (sum, account) => ({
        spend: sum.spend + account.spend,
        impressions: sum.impressions + account.impressions,
        clicks: sum.clicks + account.clicks,
        lpvs: sum.lpvs + account.lpvs,
        budget: sum.budget + account.dailyBudget,
      }),
      { spend: 0, impressions: 0, clicks: 0, lpvs: 0, budget: 0 },
    );
  }, [overview]);

  const weighted = {
    cpm: totals.impressions ? (totals.spend / totals.impressions) * 1000 : 0,
    ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks ? totals.spend / totals.clicks : 0,
    lpv: totals.lpvs ? totals.spend / totals.lpvs : 0,
  };

  return (
    <div className="ads-page">
      <div className="ads-hero">
        <div>
          <span className="ads-eyebrow">META OPERATIONS / LIVE CONTROL ROOM</span>
          <h1>Keep every account<br /><em>in view.</em></h1>
          <p>One place for spend, delivery health, rejected ads, and repeatable campaign builds.</p>
        </div>
        <div className="ads-hero-side">
          <span className="ads-live-dot" />
           <strong>{overview?.source === "mcp-bridge" ? "Live MCP feed" : "Demo data"}</strong>
          <small>{overview ? `Fetched ${new Date(overview.fetchedAt).toLocaleTimeString()}` : "Connecting…"}</small>
        </div>
      </div>

      <div className="ads-toolbar">
        <div className="ads-period"><span className="ads-period-active">Today</span><span>Yesterday</span><span>7 days</span></div>
        <div className="row"><Link href="/ads/builder" className="btn">Build campaigns</Link><button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh data"}</button></div>
      </div>

      {error && <div className="error-text card">{error}</div>}

      <section className="ads-kpis">
        <div className="ads-kpi"><span>Spend today</span><strong>{money(totals.spend)}</strong><small>Across connected accounts</small></div>
        <div className="ads-kpi"><span>LPVs</span><strong>{totals.lpvs.toLocaleString()}</strong><small>Cost {money(weighted.lpv)} each</small></div>
        <div className="ads-kpi"><span>Weighted CPM</span><strong>{money(weighted.cpm)}</strong><small>{weighted.ctr.toFixed(2)}% CTR</small></div>
        <div className="ads-kpi"><span>Planned daily budget</span><strong>{money(totals.budget)}</strong><small>{totals.clicks.toLocaleString()} clicks</small></div>
      </section>

      <section className="ads-section">
        <div className="spread"><div><span className="ads-section-kicker">ACCOUNT PULSE</span><h2>Delivery by account</h2></div><span className="muted">{overview?.timezone ?? "—"}</span></div>
        <div className="ads-account-grid">
          {(overview?.accounts ?? []).map((account) => (
            <article className="ads-account-card" key={account.accountId}>
              <div className="spread"><div><strong>{account.name}</strong><small>{account.accountId}</small></div><span className={`ads-status ads-status-${account.status}`}><i />{statusLabel(account.status)}</span></div>
              <div className="ads-account-spend"><span>Today’s spend</span><strong>{money(account.spend)}</strong></div>
              <div className="ads-mini-grid"><div><span>CPM</span><b>{money(account.cpm)}</b></div><div><span>CTR</span><b>{account.ctr.toFixed(2)}%</b></div><div><span>CPC</span><b>{money(account.cpc)}</b></div><div><span>LPV cost</span><b>{money(account.costPerLpv)}</b></div></div>
              <div className="ads-account-foot"><span>{account.activeCampaigns} active campaigns</span>{account.rejectedAds > 0 && <span className="ads-rejected">{account.rejectedAds} rejected ads</span>}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="ads-lower-grid">
        <div className="ads-panel"><span className="ads-section-kicker">AUTOMATION QUEUE</span><h2>Guardrails</h2><div className="ads-check"><span className="ads-check-icon">✓</span><div><strong>Rejected-ad monitor</strong><small>Runs every 15 minutes · pauses rejected delivery</small></div><span className="ads-status ads-status-active"><i />Ready</span></div><div className="ads-check"><span className="ads-check-icon">✓</span><div><strong>Page limit gate</strong><small>250 ads per Page · duplicate hashes blocked</small></div><span className="ads-status ads-status-active"><i />Ready</span></div><div className="ads-check"><span className="ads-check-icon">!</span><div><strong>Human approval gate</strong><small>Large publishes stop before Meta writes</small></div><span className="ads-status ads-status-unsettled"><i />Review</span></div></div>
        <div className="ads-panel ads-panel-dark"><span className="ads-section-kicker">NEXT RUN</span><h2>Build without repetition.</h2><p>Choose a folder, map five links, set country and budget, and let the queue handle uploads, dependencies, retries, and audit logs.</p><Link href="/ads/builder" className="ads-text-link">Open campaign builder <span>→</span></Link></div>
      </section>
    </div>
  );
}

export default function AdsPage() {
  return <AdsDashboard />;
}
