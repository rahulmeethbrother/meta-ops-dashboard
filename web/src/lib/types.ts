// Shared types for jobs, items and settings.
// Job/item params use snake_case on purpose: they map 1:1 onto the Python
// VideoParams model consumed by the rendering service (no field translation).

export type Role = "admin" | "user";

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export type ItemStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface VideoParams {
  video_aspect?: "9:16" | "16:9" | "1:1";
  video_concat_mode?: "random" | "sequential";
  video_transition_mode?: string;
  video_clip_duration?: number;
  video_count?: number;
  video_source?: "pexels" | "pixabay" | "coverr";
  video_language?: string;
  voice_name?: string;
  voice_volume?: number;
  voice_rate?: number;
  bgm_type?: "" | "random";
  bgm_volume?: number;
  subtitle_enabled?: boolean;
  subtitle_position?: "top" | "center" | "bottom";
  font_name?: string;
  font_size?: number;
  text_fore_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  paragraph_number?: number;
  video_script?: string;
  video_script_prompt?: string;
}

export interface JobDoc {
  uid: string;
  createdBy: string; // email, for admin views
  status: JobStatus;
  params: VideoParams;
  itemCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface VideoArtifact {
  path: string; // Cloud Storage object name
  sizeBytes: number;
  index: number;
}

export interface ItemDoc {
  uid: string;
  jobId: string;
  index: number;
  subject: string;
  status: ItemStatus;
  progress: number;
  attempts: number;
  error?: string;
  failed_stage?: string;
  videos?: VideoArtifact[];
  params?: VideoParams;
  cancelRequested?: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  startedAt?: unknown;
  finishedAt?: unknown;
}

export interface AppSettings {
  llmProvider: string;
  llmModelName?: string;
  llmBaseUrl?: string;
  subtitleProvider: "edge" | "whisper" | "";
  whisperModelSize?: string;
  azureSpeechRegion?: string;
  videoSource: "pexels" | "pixabay" | "coverr";
}

export interface CredentialStatus {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}
