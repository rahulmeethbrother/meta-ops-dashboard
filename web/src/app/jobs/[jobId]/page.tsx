"use client";

// Job detail: realtime per-item progress, downloads, retry and cancel.

import { use, useEffect, useState } from "react";
import { doc, collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import { apiFetch } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge, { ProgressBar } from "@/components/StatusBadge";

interface ItemRow {
  id: string;
  index: number;
  subject: string;
  status: string;
  progress: number;
  attempts: number;
  error?: string;
  cancelRequested?: boolean;
  videos?: Array<{ index: number; sizeBytes: number }>;
}

interface JobData {
  status: string;
  itemCount: number;
  completedCount: number;
  failedCount: number;
  createdAt?: Timestamp;
}

function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobData | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubJob = onSnapshot(doc(clientDb, "jobs", jobId), (snapshot) => {
      setJob((snapshot.data() as JobData) ?? null);
    });
    const unsubItems = onSnapshot(
      query(collection(clientDb, "jobs", jobId, "items"), orderBy("index")),
      (snapshot) => {
        setItems(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ItemRow, "id">) })),
        );
      },
    );
    return () => {
      unsubJob();
      unsubItems();
    };
  }, [jobId]);

  async function cancelJob() {
    setMessage("");
    const res = await apiFetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? "Cancellation requested." : (data.error ?? "Cancel failed"));
  }

  async function retryItem(itemId: string) {
    setMessage("");
    const res = await apiFetch(`/api/jobs/${jobId}/items/${itemId}/retry`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Retry failed");
    }
  }

  async function download(itemId: string, videoIndex: number) {
    setMessage("");
    const res = await apiFetch(`/api/jobs/${jobId}/items/${itemId}/download?video=${videoIndex}`);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Download failed");
      return;
    }
    window.open(data.url, "_blank");
  }

  const cancellable =
    job && ["queued", "processing"].includes(job.status);

  if (!job) return <div className="page-loading">Loading…</div>;

  return (
    <>
      <div className="spread">
        <h1>Job {jobId.slice(0, 8)}</h1>
        <div className="row">
          <StatusBadge status={job.status} />
          {cancellable && (
            <button className="btn btn-danger btn-sm" onClick={cancelJob}>
              Cancel pending items
            </button>
          )}
        </div>
      </div>
      <p className="muted">
        {job.completedCount}/{job.itemCount} completed
        {job.failedCount > 0 && ` · ${job.failedCount} failed`}
        {job.createdAt && ` · created ${job.createdAt.toDate().toLocaleString()}`}
      </p>
      {message && <div className="card error-text">{message}</div>}

      {items.map((item) => (
        <div className="card" key={item.id}>
          <div className="spread">
            <strong>
              {item.index + 1}. {item.subject}
            </strong>
            <div className="row">
              <StatusBadge status={item.status} />
              {item.cancelRequested && item.status === "processing" && (
                <span className="muted">cancelling…</span>
              )}
            </div>
          </div>

          {item.status === "processing" && <ProgressBar value={item.progress ?? 0} />}

          {item.error && <div className="error-text">{item.error}</div>}

          <div className="row" style={{ marginTop: 10 }}>
            {(item.videos ?? []).map((video) => (
              <button
                key={video.index}
                className="btn btn-secondary btn-sm"
                onClick={() => download(item.id, video.index)}
              >
                Download video {video.index}
                {video.sizeBytes ? ` (${(video.sizeBytes / 1024 / 1024).toFixed(1)} MB)` : ""}
              </button>
            ))}
            {["failed", "cancelled"].includes(item.status) && (
              <button className="btn btn-sm" onClick={() => retryItem(item.id)}>
                Retry
              </button>
            )}
            {item.attempts > 1 && <span className="muted">attempt {item.attempts}</span>}
          </div>
        </div>
      ))}
    </>
  );
}

export default function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return (
    <RequireAuth>
      <JobDetail jobId={jobId} />
    </RequireAuth>
  );
}
