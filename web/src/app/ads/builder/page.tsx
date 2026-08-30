"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const defaultLinks = ["https://cutt.ly/0ydtKriA", "https://cutt.ly/PydtKHqY", "https://cutt.ly/VydyVqZ9", "https://cutt.ly/dydyVQyu", "https://cutt.ly/3ydrYllJ"];

function Builder() {
  const [folder, setFolder] = useState("image_generator/generated_images_500");
  const [assetSource, setAssetSource] = useState("local_folder");
  const [assetLinks, setAssetLinks] = useState("");
  const [accountId, setAccountId] = useState("act_1074141625049232");
  const [pageId, setPageId] = useState("1199486309913687");
  const [country, setCountry] = useState("SA");
  const [minAge, setMinAge] = useState("18");
  const [maxAge, setMaxAge] = useState("65");
  const [gender, setGender] = useState("male");
  const [budget, setBudget] = useState("1");
  const [budgetMode, setBudgetMode] = useState("abo");
  const [adSetsPerCampaign, setAdSetsPerCampaign] = useState("19");
  const [adsPerAdSet, setAdsPerAdSet] = useState("1");
  const [objective, setObjective] = useState("traffic");
  const [optimization, setOptimization] = useState("landing_page_views");
  const [cta, setCta] = useState("learn_more");
  const [status, setStatus] = useState("paused");
  const [copies, setCopies] = useState("1");
  const [links, setLinks] = useState(defaultLinks);
  const [planned, setPlanned] = useState(false);

  useEffect(() => {
    void fetch("/api/ads/access").then((response) => {
      if (!response.ok) window.location.href = "/ads/access?next=/ads/builder";
    });
  }, []);

  const plan = useMemo(() => {
    const campaignCount = links.filter(Boolean).length;
    const imageCount = assetSource === "local_folder" ? 150 : assetLinks.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).length;
    const copyCount = Math.max(1, Number(copies) || 1);
    const adsets = Math.max(0, Number(adSetsPerCampaign) || 0) * campaignCount * copyCount;
    const ads = adsets * Math.max(0, Number(adsPerAdSet) || 0);
    return { campaigns: campaignCount * copyCount, adsets, ads, images: imageCount, daily: budgetMode === "cbo" ? Number(budget || 0) * campaignCount * copyCount : Number(budget || 0) * adsets };
  }, [adSetsPerCampaign, adsPerAdSet, assetLinks, assetSource, budget, budgetMode, copies, links]);

  return <div className="builder-page">
    <div className="builder-top"><Link href="/ads" className="ads-back">← Operations</Link><span className="ads-eyebrow">LIVE BUILDER / PLAN FIRST</span></div>
    <div className="builder-heading"><h1>Build with<br /><em>control.</em></h1><p>Choose the account, identity, audience, delivery settings, assets, links, and launch state. Every plan is validated before any live write.</p></div>
    <div className="builder-layout">
      <section className="builder-form card">
        <div className="builder-form-title"><span>01</span><div><h2>Campaign inputs</h2><p>Nothing publishes until the plan is reviewed.</p></div></div>
        <div className="builder-two"><label>Asset source<select value={assetSource} onChange={(event) => setAssetSource(event.target.value)}><option value="local_folder">Local folder</option><option value="image_urls">Image URLs</option><option value="dropbox">Dropbox folder/link</option><option value="mixed">Mixed sources</option></select></label><label>Local image folder<input value={folder} onChange={(event) => setFolder(event.target.value)} /></label></div>
        <label>Image URLs or Dropbox links <textarea rows={3} value={assetLinks} onChange={(event) => setAssetLinks(event.target.value)} placeholder="One public image URL or Dropbox file/folder link per line" /></label>
        <div className="builder-two"><label>Ad account<input value={accountId} onChange={(event) => setAccountId(event.target.value)} /></label><label>Facebook Page<input value={pageId} onChange={(event) => setPageId(event.target.value)} /></label></div>
        <div className="builder-two"><label>Country<select value={country} onChange={(event) => setCountry(event.target.value)}><option value="SA">Saudi Arabia</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="NZ">New Zealand</option></select></label><label>Copies per link<input type="number" min="1" max="5" value={copies} onChange={(event) => setCopies(event.target.value)} /></label></div>
        <div className="builder-two"><label>Min age<input type="number" min="18" max="65" value={minAge} onChange={(event) => setMinAge(event.target.value)} /></label><label>Max age<input type="number" min="18" max="65" value={maxAge} onChange={(event) => setMaxAge(event.target.value)} /></label></div>
        <div className="builder-two"><label>Gender<select value={gender} onChange={(event) => setGender(event.target.value)}><option value="male">Men</option><option value="female">Women</option><option value="all">All genders</option></select></label><label>Budget mode<select value={budgetMode} onChange={(event) => setBudgetMode(event.target.value)}><option value="abo">ABO · budget per ad set</option><option value="cbo">CBO · budget per campaign</option></select></label></div>
        <div className="builder-two"><label>Budget amount<input type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label>Copies per link<input type="number" min="1" max="5" value={copies} onChange={(event) => setCopies(event.target.value)} /></label></div>
        <div className="builder-two"><label>Ad sets per campaign<input type="number" min="1" value={adSetsPerCampaign} onChange={(event) => setAdSetsPerCampaign(event.target.value)} /></label><label>Ads per ad set<input type="number" min="1" value={adsPerAdSet} onChange={(event) => setAdsPerAdSet(event.target.value)} /></label></div>
        <div className="builder-two"><label>Objective<select value={objective} onChange={(event) => setObjective(event.target.value)}><option value="traffic">Traffic</option><option value="leads">Leads</option><option value="sales">Sales</option><option value="engagement">Engagement</option><option value="awareness">Awareness</option></select></label><label>Optimization<select value={optimization} onChange={(event) => setOptimization(event.target.value)}><option value="landing_page_views">Landing page views</option><option value="link_clicks">Link clicks</option><option value="conversions">Conversions</option><option value="impressions">Impressions</option><option value="reach">Reach</option></select></label></div>
        <div className="builder-two"><label>Call to action<select value={cta} onChange={(event) => setCta(event.target.value)}><option value="learn_more">Learn more</option><option value="shop_now">Shop now</option><option value="sign_up">Sign up</option><option value="get_quote">Get quote</option><option value="contact_us">Contact us</option></select></label><label>Initial status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="paused">Paused for review</option><option value="active">Active immediately</option></select></label></div>
        <label>Destination links</label><div className="builder-links">{links.map((link, index) => <div className="builder-link" key={`${index}-${link}`}><span>L{index + 1}</span><input value={link} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></div>)}</div>
        <div className="builder-note"><strong>Plan safety</strong><span>Page-limit check, duplicate guard, approval gate, and audit logging run before publish. Selected status: {status}.</span></div>
        <button className="btn builder-submit" onClick={() => setPlanned(true)}>Validate live build plan <span>→</span></button>
        {planned && <div className="builder-success">Plan validated: {plan.campaigns} campaigns, {plan.adsets} ad sets, {plan.ads} ads, {plan.images} source images, {plan.daily.toFixed(2)} daily budget. {budgetMode.toUpperCase()} structure and asset source are ready for the queued publisher.</div>}
      </section>
      <aside className="builder-summary"><span className="ads-section-kicker">02 / PLAN</span><h2>Build footprint</h2><div className="builder-stat"><span>Campaigns</span><strong>{plan.campaigns}</strong></div><div className="builder-stat"><span>Ad sets</span><strong>{plan.adsets}</strong></div><div className="builder-stat"><span>Ads</span><strong>{plan.ads}</strong></div><div className="builder-stat"><span>Source images</span><strong>{plan.images}</strong></div><div className="builder-stat"><span>{budgetMode.toUpperCase()} daily budget</span><strong>${plan.daily.toFixed(2)}</strong></div><p className="muted">{country} · {gender} · {minAge}–{maxAge} · {optimization} · {assetSource}</p></aside>
    </div>
  </div>;
}

export default function BuilderPage() { return <Builder />; }
