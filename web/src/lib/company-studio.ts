// Server-only bridge to the private Company Studio gateway. The browser never
// receives the gateway token or the upstream provider credentials.

import "server-only";

import { HttpError } from "./server-auth";

export type StudioMediaType = "image" | "video";
export type StudioMode = "text" | "reference" | "frames" | "ingredients";

export interface StudioAttachment {
  name: string;
  mime_type: string;
  data: string;
}

export interface StudioCreateRequest {
  prompt: string;
  media_type: StudioMediaType;
  mode: StudioMode;
  count: number;
  options?: {
    quality?: string;
    aspect_ratio?: string;
    duration_seconds?: number;
    resolution?: string;
    negative_prompt?: string;
  };
  references?: StudioAttachment[];
  first_frame?: StudioAttachment;
  last_frame?: StudioAttachment;
  ingredients?: StudioAttachment[];
}

export interface StudioJobRecord {
  uid: string;
  email: string;
  gatewayJobId: string;
  mediaType: StudioMediaType;
  mode: StudioMode;
  count: number;
}

const MAX_PROMPT_LENGTH = 10_000;
const MAX_COUNT = 20;
const MAX_ATTACHMENT_BASE64 = 6 * 1024 * 1024;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function attachment(value: unknown, label: string): StudioAttachment {
  const raw = record(value);
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 180) : "";
  const mimeType = typeof raw.mime_type === "string" ? raw.mime_type.trim().slice(0, 120) : "";
  const data = typeof raw.data === "string" ? raw.data : "";
  if (!name || !mimeType || !data || data.length > MAX_ATTACHMENT_BASE64) {
    throw new HttpError(400, `Invalid ${label} file.`);
  }
  if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
    throw new HttpError(400, `${label} must be an image or video file.`);
  }
  return { name, mime_type: mimeType, data };
}

function attachmentList(value: unknown, label: string): StudioAttachment[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) {
    throw new HttpError(400, `${label} must contain between 1 and 10 files.`);
  }
  return value.map((item, index) => attachment(item, `${label} item ${index + 1}`));
}

function cleanOptions(value: unknown): StudioCreateRequest["options"] | undefined {
  const raw = record(value);
  const options: NonNullable<StudioCreateRequest["options"]> = {};
  for (const name of ["quality", "aspect_ratio", "resolution"] as const) {
    const item = raw[name];
    if (typeof item === "string" && item.trim()) options[name] = item.trim().slice(0, 80);
  }
  if (typeof raw.negative_prompt === "string" && raw.negative_prompt.trim()) {
    options.negative_prompt = raw.negative_prompt.trim().slice(0, 2_000);
  }
  if (raw.duration_seconds !== undefined) {
    const duration = Number(raw.duration_seconds);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 60) {
      throw new HttpError(400, "duration_seconds must be between 1 and 60.");
    }
    options.duration_seconds = duration;
  }
  return Object.keys(options).length > 0 ? options : undefined;
}

export function sanitizeStudioRequest(input: unknown): StudioCreateRequest {
  const raw = record(input);
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  const mediaType = raw.media_type;
  const mode = raw.mode;
  const count = raw.count === undefined ? 1 : Number(raw.count);

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    throw new HttpError(400, "Prompt is required and must be 10,000 characters or fewer.");
  }
  if (mediaType !== "image" && mediaType !== "video") {
    throw new HttpError(400, "media_type must be image or video.");
  }
  if (mode !== "text" && mode !== "reference" && mode !== "frames" && mode !== "ingredients") {
    throw new HttpError(400, "mode is not supported.");
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new HttpError(400, `count must be between 1 and ${MAX_COUNT}.`);
  }
  if (mediaType === "image" && (mode === "frames" || mode === "ingredients")) {
    throw new HttpError(400, "frames and ingredients require video output.");
  }

  const request: StudioCreateRequest = {
    prompt,
    media_type: mediaType,
    mode,
    count,
    options: cleanOptions(raw.options),
  };

  if (mode === "reference") request.references = attachmentList(raw.references, "references");
  if (mode === "frames") {
    request.first_frame = attachment(raw.first_frame, "first frame");
    request.last_frame = attachment(raw.last_frame, "last frame");
  }
  if (mode === "ingredients") request.ingredients = attachmentList(raw.ingredients, "ingredients");
  return request;
}

function gatewayConfig(): { url: string; token: string } {
  const url = process.env.COMPANY_STUDIO_GATEWAY_URL?.trim().replace(/\/+$/, "");
  const token = process.env.COMPANY_STUDIO_GATEWAY_TOKEN?.trim();
  if (!url || !token) {
    throw new HttpError(503, "Company Studio is not configured. Contact the administrator.");
  }
  return { url, token };
}

export async function studioGatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const config = gatewayConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${config.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  try {
    return await fetch(`${config.url}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new HttpError(502, "Company Studio cannot reach its generation service.");
  }
}

export async function studioGatewayJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await studioGatewayFetch(path, init);
  let data: unknown = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const message = record(data).error;
    if (response.status >= 400 && response.status < 500 && typeof message === "string") {
      throw new HttpError(response.status, message);
    }
    throw new HttpError(502, "Company Studio generation service returned an error.");
  }
  return data as T;
}
