"use client";

// Client-side route gate: redirects anonymous visitors to /login and (for
// adminOnly pages) non-admins to /dashboard. This is UX only -- all data
// access is enforced again server-side and by Firestore security rules.

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (adminOnly && role !== "admin") router.replace("/dashboard");
  }, [user, role, loading, adminOnly, router]);

  if (loading || !user || (adminOnly && role !== "admin")) {
    return <div className="page-loading">Loading…</div>;
  }
  return <>{children}</>;
}
