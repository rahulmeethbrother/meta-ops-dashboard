// Browser-side Firebase SDK initialization.
// Only public identifiers live here (NEXT_PUBLIC_*); no secrets.

"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  // Next.js prerenders every page (including client components) at build
  // time, so a missing NEXT_PUBLIC_FIREBASE_* var fails the build here with
  // a clear message instead of a cryptic nested `auth/invalid-api-key`
  // during static generation. Copy web/.env.example to .env.local (or set
  // the equivalent Vercel project env vars) before building.
  throw new Error(
    `Missing required NEXT_PUBLIC_FIREBASE_* environment variable(s): ${missing.join(", ")}. ` +
      "See web/.env.example.",
  );
}

export const firebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const clientAuth = getAuth(firebaseApp);
export const clientDb = getFirestore(firebaseApp);
