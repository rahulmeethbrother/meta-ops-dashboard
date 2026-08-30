"use client";

// Single + bulk video generation. One topic per line -> one item per topic,
// each rendered and tracked independently. Users never see or enter API
// keys; the backend uses the admin-configured credentials.

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";
import { EDGE_VOICES, FONTS, LANGUAGES } from "@/lib/constants";

function NewJobForm() {
  const router = useRouter();
  const [topicsText, setTopicsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [params, setParams] = useState({
    video_aspect: "9:16",
    video_source: "pexels",
    video_concat_mode: "random",
    video_clip_duration: 5,
    video_count: 1,
    video_language: "",
    voice_name: "en-US-JennyNeural-Female",
    voice_rate: 1.0,
    voice_volume: 1.0,
    bgm_type: "random",
    bgm_volume: 0.2,
    subtitle_enabled: true,
    subtitle_position: "bottom",
    font_name: "STHeitiMedium.ttc",
    font_size: 60,
    text_fore_color: "#FFFFFF",
    paragraph_number: 1,
    video_script: "",
  });

  const topics = topicsText
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  function set<K extends keyof typeof params>(key: K, value: (typeof params)[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (topics.length === 0) {
      setError("Enter at least one topic (one per line).");
      return;
    }
    if (topics.length > 1 && params.video_script.trim()) {
      setError("A custom script only makes sense for a single topic. Remove it or keep one topic.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ topics, params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setBusy(false);
    }
  }

  return (
    <>
      <h1>New videos</h1>
      <form onSubmit={submit}>
        <div className="card">
          <h2>Topics</h2>
          <p className="muted">
            One topic per line. Each line becomes its own video with its own progress,
            retries and download.
          </p>
          <div className="field">
            <textarea
              rows={5}
              placeholder={"The history of coffee\n5 facts about the deep sea\nWhy cats sleep so much"}
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
            />
            <span className="muted">{topics.length} video(s) will be generated</span>
          </div>
          {topics.length === 1 && (
            <div className="field" style={{ marginTop: 10 }}>
              <label>Custom script (optional — leave empty to let the AI write it)</label>
              <textarea
                rows={4}
                value={params.video_script}
                onChange={(e) => set("video_script", e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="card">
          <h2>Video</h2>
          <div className="form-grid">
            <div className="field">
              <label>Aspect ratio</label>
              <select value={params.video_aspect} onChange={(e) => set("video_aspect", e.target.value)}>
                <option value="9:16">Portrait 9:16</option>
                <option value="16:9">Landscape 16:9</option>
                <option value="1:1">Square 1:1</option>
              </select>
            </div>
            <div className="field">
              <label>Material source</label>
              <select value={params.video_source} onChange={(e) => set("video_source", e.target.value)}>
                <option value="pexels">Pexels</option>
                <option value="pixabay">Pixabay</option>
                <option value="coverr">Coverr</option>
              </select>
            </div>
            <div className="field">
              <label>Clip order</label>
              <select
                value={params.video_concat_mode}
                onChange={(e) => set("video_concat_mode", e.target.value)}
              >
                <option value="random">Random</option>
                <option value="sequential">Sequential</option>
              </select>
            </div>
            <div className="field">
              <label>Max clip duration (s)</label>
              <input
                type="number"
                min={2}
                max={10}
                value={params.video_clip_duration}
                onChange={(e) => set("video_clip_duration", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Variants per topic</label>
              <select
                value={params.video_count}
                onChange={(e) => set("video_count", Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Script language</label>
              <select
                value={params.video_language}
                onChange={(e) => set("video_language", e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Script paragraphs</label>
              <input
                type="number"
                min={1}
                max={10}
                value={params.paragraph_number}
                onChange={(e) => set("paragraph_number", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Voice & music</h2>
          <div className="form-grid">
            <div className="field">
              <label>Voice</label>
              <select value={params.voice_name} onChange={(e) => set("voice_name", e.target.value)}>
                {EDGE_VOICES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Speech rate ({params.voice_rate}x)</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={params.voice_rate}
                onChange={(e) => set("voice_rate", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Background music</label>
              <select value={params.bgm_type} onChange={(e) => set("bgm_type", e.target.value)}>
                <option value="random">Random built-in track</option>
                <option value="">None</option>
              </select>
            </div>
            <div className="field">
              <label>Music volume ({params.bgm_volume})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={params.bgm_volume}
                onChange={(e) => set("bgm_volume", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Subtitles</h2>
          <div className="form-grid">
            <div className="field">
              <label>Enabled</label>
              <select
                value={params.subtitle_enabled ? "yes" : "no"}
                onChange={(e) => set("subtitle_enabled", e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="field">
              <label>Position</label>
              <select
                value={params.subtitle_position}
                onChange={(e) => set("subtitle_position", e.target.value)}
              >
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
                <option value="top">Top</option>
              </select>
            </div>
            <div className="field">
              <label>Font</label>
              <select value={params.font_name} onChange={(e) => set("font_name", e.target.value)}>
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Font size</label>
              <input
                type="number"
                min={20}
                max={120}
                value={params.font_size}
                onChange={(e) => set("font_size", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Text color</label>
              <input
                type="color"
                value={params.text_fore_color}
                onChange={(e) => set("text_fore_color", e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="card">
            <div className="error-text">{error}</div>
          </div>
        )}

        <button className="btn" disabled={busy || topics.length === 0}>
          {busy
            ? "Submitting…"
            : `Generate ${topics.length || ""} video${topics.length === 1 ? "" : "s"}`}
        </button>
      </form>
    </>
  );
}

export default function NewJobPage() {
  return (
    <RequireAuth>
      <NewJobForm />
    </RequireAuth>
  );
}
