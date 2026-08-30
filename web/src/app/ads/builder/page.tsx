"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const defaults = ["https://cutt.ly/0ydtKriA", "https://cutt.ly/PydtKHqY", "https://cutt.ly/VydyVqZ9", "https://cutt.ly/dydyVQyu", "https://cutt.ly/3ydrYllJ"];

function Builder() {
  const [folder, setFolder] = useState("image_generator/generated_images_500");
  const [country, setCountry] = useState("SA");
  const [budget, setBudget] = useState("10");
  const [links, setLinks] = useState(defaults);
  const [planned, setPlanned] = useState(false);
  const imageCount = 150;
  const plan = useMemo(() => ({ campaigns: links.length, adsets: links.length, ads: imageCount, daily: Number(budget) * links.length }), [budget, links.length]);

  useEffect(() => {
    void fetch("/api/ads/access").then((response) => {
      if (!response.ok) window.location.href = "/ads/access?next=/ads/builder";
    });
  }, []);

  return <div className="builder-page"><div className="builder-top"><Link href="/ads" className="ads-back">← Operations</Link><span className="ads-eyebrow">REPEATABLE BUILD / PLAN FIRST</span></div><div className="builder-heading"><h1>Campaigns,<br /><em>without the déjà vu.</em></h1><p>Set the template once. The worker handles asset hashing, Meta dependencies, retries, Page limits, and the audit trail.</p></div><div className="builder-layout"><section className="builder-form card"><div className="builder-form-title"><span>01</span><div><h2>Build inputs</h2><p>Nothing publishes from this screen until the approval gate passes.</p></div></div><label>Image folder<input value={folder} onChange={(event) => setFolder(event.target.value)} /></label><div className="builder-two"><label>Country<select value={country} onChange={(event) => setCountry(event.target.value)}><option value="SA">Saudi Arabia</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="NZ">New Zealand</option></select></label><label>Budget / campaign<input type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} /></label></div><label>Destination links</label><div className="builder-links">{links.map((link, index) => <div className="builder-link" key={`${index}-${link}`}><span>L{index + 1}</span><input value={link} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></div>)}</div><div className="builder-note"><strong>Fixed template</strong><span>Traffic · Landing Page Views · Men 18–65 · automatic placements · Learn More · no primary text, description, or URL tags</span></div><button className="btn builder-submit" onClick={() => setPlanned(true)}>Validate build plan <span>→</span></button>{planned && <div className="builder-success">Plan validated. Publishing remains disabled in this demo until the server-side MCP bridge is configured.</div>}</section><aside className="builder-summary"><span className="ads-section-kicker">02 / ESTIMATE</span><h2>Your run</h2><div className="builder-stat"><span>Images selected</span><strong>{imageCount}</strong></div><div className="builder-stat"><span>Campaigns</span><strong>{plan.campaigns}</strong></div><div className="builder-stat"><span>Ad sets</span><strong>{plan.adsets}</strong></div><div className="builder-stat"><span>Ads</span><strong>{plan.ads}</strong></div><div className="builder-total"><span>Planned daily budget</span><strong>${plan.daily.toLocaleString()}</strong></div><p>Images are reused across link campaigns, never repeated inside a campaign. The 250-ad Page limit is checked before writes.</p></aside></div></div>;
}

export default function BuilderPage() { return <Builder />; }
