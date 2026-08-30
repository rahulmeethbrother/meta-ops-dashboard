import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const META_OPS_COOKIE = "meta_ops_access";

export function metaOpsToken(secret: string) {
  return createHmac("sha256", secret).update("meta-ops-access").digest("base64url");
}

export function isMetaOpsAuthorized(cookieValue?: string) {
  const secret = process.env.META_OPS_PASSWORD;
  if (!secret || !cookieValue) return false;
  const expected = Buffer.from(metaOpsToken(secret));
  const actual = Buffer.from(cookieValue);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
