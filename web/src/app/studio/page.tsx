"use client";

import { FormEvent, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { apiFetch } from "@/components/AuthProvider";

type MediaType = "image" | "video";
type Mode = "text" | "reference" | "frames" | "ingredients";

interface Attachment {
  name: string;
  mime_type: string;
  data: string;
}

interface StudioOutput {
  index: number;
  status: string;
  content_type?: string;
}

interface StudioJob {
  id: string;
  status: string;
  media_type: MediaType;
  count: number;
  outputs: StudioOutput[];
  errors: Array<{ index?: number; message?: string }>;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE = 3 * 1024 * 1024;

function fileToAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} is larger than 4 MB.`);
  }
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 32_768;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return {
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      data: btoa(binary),
    };
  });
}

function modeDescription(mediaType: MediaType, mode: Mode): string {
  if (mode === "reference") return `Use one or more ${mediaType} reference files.`;
  if (mode === "frames") return "Animate a starting frame into an ending frame.";
  if (mode === "ingredients") return "Combine reference ingredients into a video.";
  return `Create a ${mediaType} from your written brief.`;
}

function StudioComposer() {
  const [prompt, setPrompt] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [mode, setMode] = useState<Mode>("text");
  const [count, setCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [quality, setQuality] = useState("original");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [ingredientFiles, setIngredientFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<StudioJob | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (mediaType === "image" && (mode === "frames" || mode === "ingredients")) {
      setMode("text");
    }
  }, [mediaType, mode]);

  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await apiFetch(`/api/studio/jobs/${jobId}`);
        const data = await response.json();
        if (stopped) return;
        if (!response.ok) {
          setError(data.error ?? "Unable to read generation status.");
          return;
        }
        setJob(data.job);
        if (!(["completed", "failed"] as string[]).includes(data.job.status)) {
          timer = setTimeout(() => void poll(), 3000);
        }
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : "Unable to read generation status.");
      }
    }

    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  function selectedModeOptions() {
    const options: Array<{ value: Mode; label: string }> = [
      { value: "text", label: "From a prompt" },
      { value: "reference", label: "From reference files" },
    ];
    if (mediaType === "video") {
      options.push(
        { value: "frames", label: "First and last frame" },
        { value: "ingredients", label: "Ingredient files" },
      );
    }
    return options;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!prompt.trim()) {
      setError("Describe what you want to create.");
      return;
    }
    if (mode === "reference" && referenceFiles.length === 0) {
      setError("Add at least one reference file.");
      return;
    }
    if (mode === "frames" && (!firstFrame || !lastFrame)) {
      setError("Add both a first frame and a last frame.");
      return;
    }
    if (mode === "ingredients" && ingredientFiles.length === 0) {
      setError("Add at least one ingredient file.");
      return;
    }
    const selectedFiles = mode === "reference"
      ? referenceFiles
      : mode === "frames"
        ? [firstFrame, lastFrame].filter((file): file is File => Boolean(file))
        : ingredientFiles;
    if (selectedFiles.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_FILE_SIZE) {
      setError("Keep the combined reference files under 3 MB for browser upload.");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        prompt,
        media_type: mediaType,
        mode,
        count,
        options: {
          aspect_ratio: aspectRatio,
          quality,
          ...(mediaType === "video" ? { duration_seconds: duration } : {}),
        },
      };
      if (mode === "reference") body.references = await Promise.all(referenceFiles.map(fileToAttachment));
      if (mode === "frames") {
        body.first_frame = await fileToAttachment(firstFrame!);
        body.last_frame = await fileToAttachment(lastFrame!);
      }
      if (mode === "ingredients") body.ingredients = await Promise.all(ingredientFiles.map(fileToAttachment));

      const response = await apiFetch("/api/studio/jobs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to start generation.");
      setJob(null);
      setJobId(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start generation.");
    } finally {
      setBusy(false);
    }
  }

  async function download(index: number) {
    if (!jobId) return;
    setDownloading(index);
    setError("");
    try {
      const response = await apiFetch(`/api/studio/jobs/${jobId}/outputs/${index}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Download failed.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `company-studio-${jobId.slice(0, 8)}-${index}.${job?.media_type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  }

  function startOver() {
    setJobId(null);
    setJob(null);
    setError("");
  }

  const isWorking = job && !["completed", "failed"].includes(job.status);

  return (
    <div className="studio-page">
      <section className="studio-hero">
        <div className="studio-kicker">PRIVATE CREATIVE DESK</div>
        <h1>Make the idea real.</h1>
        <p>Describe the moment, choose the format, and get finished media without leaving your workspace.</p>
        <div className="studio-hero-note">
          <span className="studio-live-dot" /> Your workspace is ready
        </div>
      </section>

      <form className="studio-layout" onSubmit={submit}>
        <section className="studio-panel studio-composer">
          <div className="studio-panel-heading">
            <div>
              <span className="studio-step">01</span>
              <h2>Describe your creative</h2>
            </div>
            <span className="studio-private-pill">Private</span>
          </div>
          <textarea
            className="studio-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A slow, cinematic product reveal on a sunlit stone table..."
            rows={7}
            disabled={Boolean(isWorking)}
          />
          <div className="studio-prompt-footer">
            <span>{prompt.length}/10,000 characters</span>
            <span>Be specific about motion, light, mood, and framing.</span>
          </div>

          <div className="studio-section-divider" />
          <div className="studio-panel-heading compact">
            <div>
              <span className="studio-step">02</span>
              <h2>Choose an output</h2>
            </div>
          </div>
          <div className="studio-segmented" role="group" aria-label="Output type">
            {(["video", "image"] as MediaType[]).map((value) => (
              <button
                type="button"
                key={value}
                className={mediaType === value ? "selected" : ""}
                onClick={() => setMediaType(value)}
                disabled={Boolean(isWorking)}
              >
                <span>{value === "video" ? "Motion" : "Still"}</span>
                <small>{value === "video" ? "MP4" : "PNG"}</small>
              </button>
            ))}
          </div>
          <div className="studio-field-grid">
            <label className="studio-field">
              <span>Creation mode</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} disabled={Boolean(isWorking)}>
                {selectedModeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="studio-field">
              <span>Variations</span>
              <select value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={Boolean(isWorking)}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="studio-field">
              <span>Aspect ratio</span>
              <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} disabled={Boolean(isWorking)}>
                <option value="9:16">Portrait 9:16</option>
                <option value="16:9">Landscape 16:9</option>
                <option value="1:1">Square 1:1</option>
                <option value="3:4">Portrait 3:4</option>
              </select>
            </label>
            {mediaType === "video" && (
              <label className="studio-field">
                <span>Duration</span>
                <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} disabled={Boolean(isWorking)}>
                  {[5, 8, 10, 15, 30].map((value) => (
                    <option key={value} value={value}>
                      {value} seconds
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="studio-field">
              <span>Finish</span>
              <select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={Boolean(isWorking)}>
                <option value="original">Original detail</option>
                <option value="high">High detail</option>
                <option value="standard">Standard</option>
              </select>
            </label>
          </div>

          {mode === "reference" && (
            <div className="studio-upload-block">
              <label className="studio-upload-label" htmlFor="reference-files">Reference files</label>
              <input
                id="reference-files"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(event) => setReferenceFiles(Array.from(event.target.files ?? []))}
                disabled={Boolean(isWorking)}
              />
              <span className="studio-upload-help">Up to 2 MB each. {referenceFiles.length ? `${referenceFiles.length} selected.` : "Add images or clips."}</span>
            </div>
          )}
          {mode === "frames" && (
            <div className="studio-frame-grid">
              <label className="studio-upload-block">
                <span className="studio-upload-label">First frame</span>
                <input type="file" accept="image/*" onChange={(event) => setFirstFrame(event.target.files?.[0] ?? null)} disabled={Boolean(isWorking)} />
                <span className="studio-upload-help">{firstFrame?.name ?? "Choose an image"}</span>
              </label>
              <label className="studio-upload-block">
                <span className="studio-upload-label">Last frame</span>
                <input type="file" accept="image/*" onChange={(event) => setLastFrame(event.target.files?.[0] ?? null)} disabled={Boolean(isWorking)} />
                <span className="studio-upload-help">{lastFrame?.name ?? "Choose an image"}</span>
              </label>
            </div>
          )}
          {mode === "ingredients" && (
            <div className="studio-upload-block">
              <label className="studio-upload-label" htmlFor="ingredient-files">Ingredient files</label>
              <input
                id="ingredient-files"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(event) => setIngredientFiles(Array.from(event.target.files ?? []))}
                disabled={Boolean(isWorking)}
              />
              <span className="studio-upload-help">Up to 2 MB each. {ingredientFiles.length ? `${ingredientFiles.length} selected.` : "Add visual ingredients."}</span>
            </div>
          )}

          {error && <div className="studio-error">{error}</div>}
          <button className="studio-submit" disabled={busy || Boolean(isWorking)}>
            <span>{busy ? "Preparing your brief…" : isWorking ? "Creating your media…" : "Generate in Company Studio"}</span>
            <span className="studio-submit-arrow">↗</span>
          </button>
        </section>

        <aside className="studio-panel studio-summary">
          <div className="studio-summary-top">
            <span className="studio-step">BRIEF</span>
            <span className="studio-summary-mark">✦</span>
          </div>
          <h2>Your setup</h2>
          <p className="studio-summary-description">{modeDescription(mediaType, mode)}</p>
          <div className="studio-summary-list">
            <div><span>Format</span><strong>{mediaType === "video" ? "Motion / MP4" : "Still / PNG"}</strong></div>
            <div><span>Canvas</span><strong>{aspectRatio}</strong></div>
            <div><span>Versions</span><strong>{count}</strong></div>
            <div><span>Delivery</span><strong>Browser download</strong></div>
          </div>
          <div className="studio-summary-rule" />
          <p className="studio-trust-copy"><span>●</span> Your prompts and files are sent only to your private generation workspace.</p>
        </aside>
      </form>

      {job && (
        <section className="studio-results">
          <div className="studio-results-heading">
            <div>
              <span className="studio-kicker">GENERATION STATUS</span>
              <h2>{job.status === "completed" ? "Your media is ready." : job.status === "failed" ? "Generation needs attention." : "Your media is in progress."}</h2>
            </div>
            <span className={`studio-status studio-status-${job.status}`}><span />{job.status}</span>
          </div>
          <div className="studio-result-grid">
            {job.outputs.map((output) => (
              <div className="studio-result-card" key={output.index}>
                <div className="studio-result-index">0{output.index}</div>
                <div className="studio-result-meta">
                  <strong>{job.media_type === "video" ? "Motion study" : "Still study"} {output.index}</strong>
                  <span>{output.status === "completed" ? "Ready to download" : output.status}</span>
                </div>
                {output.status === "completed" && (
                  <button className="studio-download" onClick={() => void download(output.index)} disabled={downloading === output.index}>
                    {downloading === output.index ? "Downloading…" : "Download"}
                  </button>
                )}
              </div>
            ))}
          </div>
          {job.status === "completed" && <button type="button" className="studio-start-over" onClick={startOver}>Start another creation</button>}
          {job.errors.length > 0 && <div className="studio-error">{job.errors.map((item) => item.message).filter(Boolean).join(" ")}</div>}
        </section>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <RequireAuth>
      <StudioComposer />
    </RequireAuth>
  );
}
