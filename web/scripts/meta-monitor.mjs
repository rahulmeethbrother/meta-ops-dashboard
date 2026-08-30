const baseUrl = process.env.META_OPS_URL || process.env.RENDER_EXTERNAL_URL;
const secret = process.env.META_MONITOR_SECRET;

if (!baseUrl || !secret) {
  throw new Error("META_OPS_URL/RENDER_EXTERNAL_URL and META_MONITOR_SECRET are required");
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ads/rejections`, {
  method: "POST",
  headers: { "x-meta-monitor-secret": secret },
});
const body = await response.text();
if (!response.ok) throw new Error(`Monitor failed (${response.status}): ${body}`);
console.log(body);
