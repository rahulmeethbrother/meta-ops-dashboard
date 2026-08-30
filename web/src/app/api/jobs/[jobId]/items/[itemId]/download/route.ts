// GET /api/jobs/:jobId/items/:itemId/download?video=1
// Returns a short-lived signed URL for one finished video. Ownership is
// verified server-side; the storage bucket itself is fully private.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireUser } from "@/lib/server-auth";
import { signDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string; itemId: string }> },
) {
  try {
    const user = await requireUser(req);
    const { jobId, itemId } = await ctx.params;
    const videoIndex = parseInt(req.nextUrl.searchParams.get("video") ?? "1", 10) || 1;

    const itemSnap = await db()
      .collection("jobs")
      .doc(jobId)
      .collection("items")
      .doc(itemId)
      .get();
    if (!itemSnap.exists) throw new HttpError(404, "Item not found");
    const item = itemSnap.data()!;
    if (item.uid !== user.uid && user.role !== "admin") {
      throw new HttpError(403, "Not your item");
    }

    const videos: Array<{ path: string; index: number }> = item.videos ?? [];
    const video = videos.find((v) => v.index === videoIndex);
    if (!video) throw new HttpError(404, "Video not found (not finished yet?)");

    // Belt & braces: the object must live under this owner's prefix.
    if (!video.path.startsWith(`videos/${item.uid}/`)) {
      throw new HttpError(403, "Invalid artifact path");
    }

    const safeSubject = String(item.subject ?? "video")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 60);
    const url = await signDownloadUrl(video.path, `${safeSubject || "video"}-${videoIndex}.mp4`);
    return NextResponse.json({ url, expiresInSeconds: 900 });
  } catch (err) {
    return errorResponse(err);
  }
}
