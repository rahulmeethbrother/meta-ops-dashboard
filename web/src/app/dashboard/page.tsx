"use client";

// Job list with realtime updates via Firestore snapshot listeners.
// Firestore security rules restrict reads to the owner (or admins), so this
// client-side query cannot see other users' jobs even if tampered with.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import { useAuth } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";

interface JobRow {
  id: string;
  status: string;
  itemCount: number;
  completedCount: number;
  failedCount: number;
  createdBy?: string;
  createdAt?: Timestamp;
}

function JobList() {
  const { user, role } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    const base = collection(clientDb, "jobs");
    const q =
      role === "admin" && showAll
        ? query(base, orderBy("createdAt", "desc"))
        : query(base, where("uid", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setJobs(
        snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<JobRow, "id">) })),
      );
    });
  }, [user, role, showAll]);

  return (
    <>
      <div className="spread">
        <h1>Jobs</h1>
        <div className="row">
          {role === "admin" && (
            <button className="btn btn-secondary" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show my jobs" : "Show all users"}
            </button>
          )}
          <Link href="/new" className="btn">
            New videos
          </Link>
        </div>
      </div>

      <div className="card">
        {jobs.length === 0 ? (
          <p className="muted">No jobs yet. Create your first batch of videos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Created</th>
                {role === "admin" && showAll && <th>User</th>}
                <th>Videos</th>
                <th>Status</th>
                <th>Progress</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.createdAt?.toDate().toLocaleString() ?? "…"}</td>
                  {role === "admin" && showAll && <td>{job.createdBy}</td>}
                  <td>{job.itemCount}</td>
                  <td>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="muted">
                    {job.completedCount}/{job.itemCount} done
                    {job.failedCount > 0 && `, ${job.failedCount} failed`}
                  </td>
                  <td>
                    <Link href={`/jobs/${job.id}`}>Details →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <JobList />
    </RequireAuth>
  );
}
