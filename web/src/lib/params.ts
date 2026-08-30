// Server-side validation of user-supplied generation parameters.
// Only whitelisted fields with sane bounds reach Firestore / the renderer.
// (The renderer applies its own whitelist too -- defense in depth.)

import type { VideoParams } from "./types";

const STRING_ENUMS: Record<string, string[]> = {
  video_aspect: ["9:16", "16:9", "1:1"],
  video_concat_mode: ["random", "sequential"],
  // "" is intentionally NOT allowed: the upstream enum only accepts null or a
  // named transition, so an absent key means "no transition".
  video_transition_mode: ["Shuffle", "FadeIn", "FadeOut", "SlideIn", "SlideOut"],
  video_source: ["pexels", "pixabay", "coverr"],
  bgm_type: ["", "random"],
  subtitle_position: ["top", "center", "bottom"],
};

const NUMBERS: Record<string, [number, number]> = {
  video_clip_duration: [2, 10],
  video_count: [1, 5],
  voice_volume: [0, 2],
  voice_rate: [0.5, 2],
  bgm_volume: [0, 1],
  font_size: [20, 120],
  stroke_width: [0, 10],
  paragraph_number: [1, 10],
};

const FREE_STRINGS: Record<string, number> = {
  video_language: 20,
  voice_name: 120,
  font_name: 120,
  text_fore_color: 9,
  stroke_color: 9,
  video_script: 10000,
  video_script_prompt: 2000,
};

const BOOLEANS = new Set(["subtitle_enabled"]);

export function sanitizeParams(input: unknown): VideoParams {
  const raw = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, allowed] of Object.entries(STRING_ENUMS)) {
    const value = raw[key];
    if (typeof value === "string" && allowed.includes(value)) out[key] = value;
  }
  for (const [key, [min, max]] of Object.entries(NUMBERS)) {
    const value = Number(raw[key]);
    if (Number.isFinite(value)) out[key] = Math.min(max, Math.max(min, value));
  }
  for (const [key, maxLen] of Object.entries(FREE_STRINGS)) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim().slice(0, maxLen);
  }
  for (const key of BOOLEANS) {
    if (typeof raw[key] === "boolean") out[key] = raw[key];
  }

  return out as VideoParams;
}

export function sanitizeTopics(input: unknown, maxItems: number): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, 500))
    .filter((t) => t.length > 0)
    .slice(0, maxItems);
}
