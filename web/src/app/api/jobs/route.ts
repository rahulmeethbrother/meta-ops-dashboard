// POST /api/jobs -- create a generation job (single or bulk).
// GET  /api/jobs -- list own jobs (admins see all).
//
// A job contains one item per topic; every item is rendered independently
// (own Cloud Task, own progress/status/retries), so one bad topic never sinks
// the batch.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";
import { sanitizeParams, sanitizeTopics } from "@/lib/params";
import { enforceRateLimits, LIMITS } from "@/lib/rate-limit";
import { enqueueRenderTask } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Creating a large bulk job enqueues up to MAX_ITEMS_PER_JOB Cloud Tasks.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    const topics = sanitizeTopics(body.topics, LIMITS.maxItemsPerJob());
    if (topics.length === 0) {
      throw new HttpError(400, "Provide at least one topic (topics: string[])");
    }
    const params = sanitizeParams(body.params);

    await enforceRateLimits(user.uid, topics.length);

    const firestore = db();
    const jobRef = firestore.collection("jobs").doc();
    const batch = firestore.batch();

    batch.set(jobRef, {
      uid: user.uid,
      createdBy: user.email,
      status: "queued",
      params,
      itemCount: topics.length,
      completedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const itemIds: string[] = [];
    topics.forEach((subject, index) => {
      const itemRef = jobRef.collection("items").doc();
      itemIds.push(itemRef.id);
      batch.set(itemRef, {
        uid: user.uid,
        jobId: jobRef.id,
        index,
        subject,
        status: "queued",
        progress: 0,
        attempts: 0,
        cancelRequested: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Enqueue after the docs exist so the renderer always finds them.
    const enqueueErrors: string[] = [];
    await Promise.all(
      itemIds.map(async (itemId) => {
        try {
          await enqueueRenderTask(jobRef.id, itemId);
        } catch (err) {
          enqueueErrors.push(itemId);
          console.error(`failed to enqueue item ${itemId}:`, err);
          await jobRef.collection("items").doc(itemId).set(
            {
              status: "failed",
              error: "Failed to enqueue render task. Use Retry.",
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      }),
    );

    return NextResponse.json(
      { jobId: jobRef.id, itemCount: topics.length, enqueueErrors },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50, 100);

    let query = db().collection("jobs").orderBy("createdAt", "desc").limit(limit);
    if (user.role !== "admin") {
      query = db()
        .collection("jobs")
        .where("uid", "==", user.uid)
        .orderBy("createdAt", "desc")
        .limit(limit);
    }
    const snapshot = await query.get();
    const jobs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ jobs });
  } catch (err) {
    return errorResponse(err);
  }
}
