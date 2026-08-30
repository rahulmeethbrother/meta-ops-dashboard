// Per-user rate limiting enforced server-side before any job is created.
// Uses Firestore aggregate count queries over the user's own items, so limits
// hold across serverless instances (no in-memory counters).

import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase-admin";
import { HttpError } from "./server-auth";

function intEnv(name: string, fallback: number): number {
  const value = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const LIMITS = {
  maxItemsPerJob: () => intEnv("MAX_ITEMS_PER_JOB", 20),
  maxActiveItems: () => intEnv("MAX_ACTIVE_ITEMS", 10),
  maxItemsPerHour: () => intEnv("MAX_ITEMS_PER_HOUR", 30),
};

export async function enforceRateLimits(uid: string, newItemCount: number): Promise<void> {
  const firestore = db();
  const items = firestore.collectionGroup("items");

  const activeSnap = await items
    .where("uid", "==", uid)
    .where("status", "in", ["queued", "processing"])
    .count()
    .get();
  const active = activeSnap.data().count;
  if (active + newItemCount > LIMITS.maxActiveItems()) {
    throw new HttpError(
      429,
      `Too many active videos (${active} in progress, limit ${LIMITS.maxActiveItems()}). ` +
        "Wait for current jobs to finish or cancel them.",
    );
  }

  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const recentSnap = await items
    .where("uid", "==", uid)
    .where("createdAt", ">=", oneHourAgo)
    .count()
    .get();
  const recent = recentSnap.data().count;
  if (recent + newItemCount > LIMITS.maxItemsPerHour()) {
    throw new HttpError(
      429,
      `Hourly limit reached (${recent}/${LIMITS.maxItemsPerHour()} videos in the last hour). ` +
        "Try again later.",
    );
  }
}
