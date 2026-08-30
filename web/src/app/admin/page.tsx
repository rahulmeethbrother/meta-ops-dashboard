"use client";

// Admin panel: provider credentials (write-only), non-secret settings, users.
// The role gate here is cosmetic -- every API call below is re-authorized
// server-side via the verified ID token's custom claims.

import { useCallback, useEffect, useState } from "react";
import { apiFetch, useAuth } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";
import type { AppSettings, CredentialStatus } from "@/lib/types";

/* ---------------------------- Credentials tab ---------------------------- */

function CredentialsTab() {
  const [credentials, setCredentials] = useState<CredentialStatus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch("/api/admin/credentials");
    const data = await res.json();
    if (res.ok) setCredentials(data.credentials);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: string) {
    const value = drafts[id] ?? "";
    if (!value.trim()) return;
    setMessage("");
    const res = await apiFetch("/api/admin/credentials", {
      method: "PUT",
      body: JSON.stringify({ id, value }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    // Clear the input immediately: values are write-only and never re-read.
    setDrafts((d) => ({ ...d, [id]: "" }));
    setMessage(`Saved ${id}. The key is stored in Secret Manager and cannot be viewed again.`);
    void load();
  }

  async function remove(id: string) {
    if (!confirm(`Remove credential ${id}?`)) return;
    setMessage("");
    const res = await apiFetch(`/api/admin/credentials?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setMessage(res.ok ? `Removed ${id}.` : (data.error ?? "Delete failed"));
    void load();
  }

  return (
    <>
      <p className="muted">
        Keys are written directly to Google Secret Manager. They are never shown again after
        saving — not even to admins — and are never sent to any browser.
      </p>
      {message && <p className="muted">{message}</p>}
      {credentials.map((cred) => (
        <div className="card" key={cred.id}>
          <div className="spread">
            <div>
              <strong>{cred.label}</strong>
              <div className="muted">{cred.description}</div>
              {cred.configured && cred.updatedAt && (
                <div className="muted">
                  Last updated {new Date(cred.updatedAt).toLocaleString()} by {cred.updatedBy}
                </div>
              )}
            </div>
            <span className={`badge ${cred.configured ? "badge-configured" : "badge-missing"}`}>
              {cred.configured ? "configured" : "not set"}
            </span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input
              type="password"
              autoComplete="off"
              placeholder={cred.configured ? "Enter new value to rotate" : "Enter API key"}
              value={drafts[cred.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [cred.id]: e.target.value }))}
              style={{ flex: 1, minWidth: 260 }}
            />
            <button className="btn btn-sm" onClick={() => save(cred.id)}>
              Save
            </button>
            {cred.configured && (
              <button className="btn btn-danger btn-sm" onClick={() => remove(cred.id)}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

/* ------------------------------ Settings tab ----------------------------- */

function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setProviders(data.llmProviders);
      }
    })();
  }, []);

  async function save() {
    if (!settings) return;
    setMessage("");
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setMessage(res.ok ? "Settings saved. New jobs pick them up immediately." : (data.error ?? "Save failed"));
  }

  if (!settings) return <div className="page-loading">Loading…</div>;

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <div className="card">
      <h2>Generation settings (non-secret)</h2>
      <div className="form-grid">
        <div className="field">
          <label>LLM provider</label>
          <select value={settings.llmProvider} onChange={(e) => set("llmProvider", e.target.value)}>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>LLM model (empty = provider default)</label>
          <input
            value={settings.llmModelName ?? ""}
            onChange={(e) => set("llmModelName", e.target.value)}
            placeholder="e.g. gpt-4o-mini"
          />
        </div>
        <div className="field">
          <label>LLM base URL (empty = provider default)</label>
          <input
            value={settings.llmBaseUrl ?? ""}
            onChange={(e) => set("llmBaseUrl", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Subtitle provider</label>
          <select
            value={settings.subtitleProvider}
            onChange={(e) => set("subtitleProvider", e.target.value as AppSettings["subtitleProvider"])}
          >
            <option value="edge">edge (TTS timings, free)</option>
            <option value="whisper">whisper (local transcription, needs big instance)</option>
            <option value="">disabled</option>
          </select>
        </div>
        <div className="field">
          <label>Whisper model size</label>
          <input
            value={settings.whisperModelSize ?? ""}
            onChange={(e) => set("whisperModelSize", e.target.value)}
            placeholder="large-v3"
          />
        </div>
        <div className="field">
          <label>Azure Speech region</label>
          <input
            value={settings.azureSpeechRegion ?? ""}
            onChange={(e) => set("azureSpeechRegion", e.target.value)}
            placeholder="eastus"
          />
        </div>
        <div className="field">
          <label>Default material source</label>
          <select
            value={settings.videoSource}
            onChange={(e) => set("videoSource", e.target.value as AppSettings["videoSource"])}
          >
            <option value="pexels">pexels</option>
            <option value="pixabay">pixabay</option>
            <option value="coverr">coverr</option>
          </select>
        </div>
      </div>
      {message && <p className="muted">{message}</p>}
      <button className="btn" style={{ marginTop: 12 }} onClick={save}>
        Save settings
      </button>
    </div>
  );
}

/* -------------------------------- Users tab ------------------------------- */

interface UserRow {
  uid: string;
  email: string;
  role: string;
  disabled: boolean;
  lastSignIn?: string;
}

function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch("/api/admin/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setRole(email: string, role: "admin" | "user") {
    setMessage("");
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setMessage(res.ok ? `${email} is now ${role}.` : (data.error ?? "Update failed"));
    void load();
  }

  return (
    <div className="card">
      <h2>Users</h2>
      {message && <p className="muted">{message}</p>}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Last sign-in</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.email}</td>
              <td>
                <span className={`badge ${u.role === "admin" ? "badge-admin" : "badge-missing"}`}>
                  {u.role}
                </span>
              </td>
              <td className="muted">{u.lastSignIn ?? "never"}</td>
              <td>
                {u.uid !== me?.uid &&
                  (u.role === "admin" ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => setRole(u.email, "user")}>
                      Demote to user
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => setRole(u.email, "admin")}>
                      Make admin
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

function AdminPanel() {
  const [tab, setTab] = useState<"credentials" | "settings" | "users">("credentials");
  return (
    <>
      <h1>Admin</h1>
      <div className="tabs">
        <button className={tab === "credentials" ? "active" : ""} onClick={() => setTab("credentials")}>
          API credentials
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          Settings
        </button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          Users
        </button>
      </div>
      {tab === "credentials" && <CredentialsTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "users" && <UsersTab />}
    </>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth adminOnly>
      <AdminPanel />
    </RequireAuth>
  );
}
