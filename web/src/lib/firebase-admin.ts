// Server-only Firebase Admin initialization.
// Credentials come from FIREBASE_SERVICE_ACCOUNT_B64 (base64-encoded service
// account JSON stored as an encrypted Vercel env var). This module must never
// be imported from client components.

import "server-only";
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;
let cachedServiceAccount: { project_id: string; client_email: string; private_key: string } | null =
  null;

export function serviceAccount() {
  if (!cachedServiceAccount) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is not set");
    cachedServiceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  }
  return cachedServiceAccount!;
}

export function gcpProject(): string {
  return process.env.GCP_PROJECT || serviceAccount().project_id;
}

export function adminApp(): App {
  if (!cachedApp) {
    const existing = getApps();
    cachedApp =
      existing.length > 0
        ? existing[0]
        : initializeApp({ credential: cert(serviceAccount() as never) });
  }
  return cachedApp;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function db() {
  return getFirestore(adminApp());
}
