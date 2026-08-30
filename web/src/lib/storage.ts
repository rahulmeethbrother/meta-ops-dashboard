// Signed download URLs for finished videos.
// The bucket is fully private (see firebase/storage.rules) -- users get
// short-lived V4 signed URLs only for objects under their own uid prefix,
// which the jobs API verifies before signing.

import "server-only";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "./firebase-admin";

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function signDownloadUrl(objectPath: string, downloadName: string): Promise<string> {
  const bucketName = process.env.OUTPUT_BUCKET;
  if (!bucketName) throw new Error("OUTPUT_BUCKET is not set");

  const bucket = getStorage(adminApp()).bucket(bucketName);
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
    responseDisposition: `attachment; filename="${downloadName}"`,
  });
  return url;
}
