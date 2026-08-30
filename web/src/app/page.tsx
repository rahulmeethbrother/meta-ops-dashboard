"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ads");
  }, [router]);

  return <div className="page-loading">Loading…</div>;
}
