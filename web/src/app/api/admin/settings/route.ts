// Admin-only NON-SECRET settings (Firestore settings/app), read by the
// renderer at job time: which LLM provider to use, subtitle provider, etc.
// API keys never live here -- see /api/admin/credentials.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { errorResponse, HttpError, requireAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Provider ids supported by the vendored upstream LLM registry.
const LLM_PROVIDERS = [
  "openai",
  "moonshot",
  "gemini",
  "deepseek",
  "qwen",
  "azure",
  "aihubmix",
  "grok",
  "groq",
  "volcengine",
  "minimax",
  "cloudflare",
  "modelscope",
  "aimlapi",
  "oneapi",
  "litellm",
  "pollinations",
];
const SUBTITLE_PROVIDERS = ["edge", "whisper", ""];
const VIDEO_SOURCES = ["pexels", "pixabay", "coverr"];
const DEFAULTS = {
  llmProvider: "openai",
  llmModelName: "",
  llmBaseUrl: "",
  subtitleProvider: "edge",
  whisperModelSize: "large-v3",
  azureSpeechRegion: "",
  videoSource: "pexels",
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snapshot = await db().collection("settings").doc("app").get();
    return NextResponse.json({
      settings: { ...DEFAULTS, ...(snapshot.data() ?? {}) },
      llmProviders: LLM_PROVIDERS,
      subtitleProviders: SUBTITLE_PROVIDERS,
      videoSources: VIDEO_SOURCES,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));

    const update: Record<string, unknown> = {};
    if (typeof body.llmProvider === "string") {
      if (!LLM_PROVIDERS.includes(body.llmProvider)) throw new HttpError(400, "Unknown LLM provider");
      update.llmProvider = body.llmProvider;
    }
    if (typeof body.subtitleProvider === "string") {
      if (!SUBTITLE_PROVIDERS.includes(body.subtitleProvider)) {
        throw new HttpError(400, "Unknown subtitle provider");
      }
      update.subtitleProvider = body.subtitleProvider;
    }
    if (typeof body.videoSource === "string") {
      if (!VIDEO_SOURCES.includes(body.videoSource)) throw new HttpError(400, "Unknown video source");
      update.videoSource = body.videoSource;
    }
    for (const key of ["llmModelName", "llmBaseUrl", "azureSpeechRegion", "whisperModelSize"]) {
      if (typeof body[key] === "string") update[key] = body[key].trim().slice(0, 300);
    }
    if (Object.keys(update).length === 0) throw new HttpError(400, "Nothing to update");

    update.updatedAt = FieldValue.serverTimestamp();
    update.updatedBy = admin.email;
    await db().collection("settings").doc("app").set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
