#!/usr/bin/env node
// Bootstrap the first admin (custom claim { role: "admin" }).
//
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=./sa-key.json   # or FIREBASE_SERVICE_ACCOUNT_B64
//   node scripts/set-admin.mjs admin@example.com
//
// The user must have signed up once (email/password or Google) before running.

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin.mjs <email>");
  process.exit(1);
}

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
const app = initializeApp({
  credential: b64
    ? cert(JSON.parse(Buffer.from(b64, "base64").toString("utf-8")))
    : applicationDefault(),
});

const auth = getAuth(app);
const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(`No Firebase Auth user found for ${email}. Sign up in the app first.`);
  process.exit(1);
}

await auth.setCustomUserClaims(user.uid, { role: "admin" });
await auth.revokeRefreshTokens(user.uid);
await getFirestore(app).collection("users").doc(user.uid).set(
  { email, role: "admin", updatedAt: FieldValue.serverTimestamp(), updatedBy: "set-admin script" },
  { merge: true },
);

console.log(`${email} (${user.uid}) is now an admin. They must sign out/in (or wait ~1h) for the new token.`);
