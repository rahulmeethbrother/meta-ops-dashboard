"use client";

import { FormEvent, useState } from "react";

export default function AdsAccessPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/ads/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("Incorrect password.");
      setBusy(false);
      return;
    }
    window.location.href = new URLSearchParams(window.location.search).get("next") || "/ads";
  }

  return (
    <main className="ads-access-page">
      <section className="card ads-access-card">
        <span className="ads-eyebrow">PRIVATE META OPERATIONS</span>
        <h1>Enter access password</h1>
        <p>This dashboard is protected. Set `META_OPS_PASSWORD` in Render to control access.</p>
        <form onSubmit={submit}>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /></label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={busy || !password}>{busy ? "Checking…" : "Unlock dashboard"}</button>
        </form>
      </section>
    </main>
  );
}
