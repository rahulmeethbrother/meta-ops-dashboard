// Admin credential management backed by Google Secret Manager.
//
// Security invariants:
//  * Secret VALUES only flow client -> server (PUT). They are written straight
//    to Secret Manager and never persisted anywhere else.
//  * No API response ever contains a secret value -- not even to the admin who
//    just saved it. Reads return configured/updatedAt metadata only.
//  * The renderer reads `latest` versions at job time, so rotations take
//    effect without redeploys.

import "server-only";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { FieldValue } from "firebase-admin/firestore";
import { db, gcpProject, serviceAccount } from "./firebase-admin";
import type { CredentialStatus } from "./types";

export const CREDENTIAL_CATALOG: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
}> = [
  {
    id: "llm-api-key",
    label: "LLM API key",
    description: "API key for the LLM provider selected in Settings (script generation).",
  },
  {
    id: "pexels-api-key",
    label: "Pexels API key",
    description: "Stock video search & download (https://www.pexels.com/api/).",
  },
  {
    id: "pixabay-api-key",
    label: "Pixabay API key",
    description: "Stock video search & download (https://pixabay.com/api/docs/).",
  },
  {
    id: "coverr-api-key",
    label: "Coverr API key",
    description: "Stock video search & download (https://coverr.co/developers).",
  },
  {
    id: "azure-speech-key",
    label: "Azure Speech key",
    description: "Azure TTS V2 voices. Region is set in Settings (not a secret).",
  },
  {
    id: "twelvelabs-api-key",
    label: "TwelveLabs API key",
    description: "Optional semantic re-ranking of material search terms.",
  },
];

const VALID_IDS = new Set(CREDENTIAL_CATALOG.map((c) => c.id));

function secretPrefix(): string {
  return process.env.SECRET_PREFIX || "mpt";
}

let client: SecretManagerServiceClient | null = null;
function sm(): SecretManagerServiceClient {
  if (!client) {
    const sa = serviceAccount();
    client = new SecretManagerServiceClient({
      projectId: gcpProject(),
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
    });
  }
  return client;
}

function secretName(id: string): string {
  return `projects/${gcpProject()}/secrets/${secretPrefix()}-${id}`;
}

export function isValidCredentialId(id: string): boolean {
  return VALID_IDS.has(id);
}

export async function setCredential(id: string, value: string, adminEmail: string): Promise<void> {
  if (!isValidCredentialId(id)) throw new Error(`unknown credential id: ${id}`);

  // Create the secret container if it does not exist yet.
  try {
    await sm().createSecret({
      parent: `projects/${gcpProject()}`,
      secretId: `${secretPrefix()}-${id}`,
      secret: { replication: { automatic: {} } },
    });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code !== 6 /* ALREADY_EXISTS */) throw err;
  }

  await sm().addSecretVersion({
    parent: secretName(id),
    payload: { data: Buffer.from(value.trim(), "utf-8") },
  });

  // Metadata only (never the value) for the admin panel.
  await db()
    .collection("settings")
    .doc("providers")
    .set(
      { [id]: { configured: true, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminEmail } },
      { merge: true },
    );
}

export async function deleteCredential(id: string, adminEmail: string): Promise<void> {
  if (!isValidCredentialId(id)) throw new Error(`unknown credential id: ${id}`);
  try {
    await sm().deleteSecret({ name: secretName(id) });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code !== 5 /* NOT_FOUND */) throw err;
  }
  await db()
    .collection("settings")
    .doc("providers")
    .set(
      { [id]: { configured: false, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminEmail } },
      { merge: true },
    );
}

export async function listCredentialStatuses(): Promise<CredentialStatus[]> {
  const snapshot = await db().collection("settings").doc("providers").get();
  const meta = (snapshot.data() ?? {}) as Record<
    string,
    { configured?: boolean; updatedAt?: { toDate(): Date }; updatedBy?: string }
  >;
  return CREDENTIAL_CATALOG.map((entry) => {
    const m = meta[entry.id] ?? {};
    return {
      ...entry,
      configured: Boolean(m.configured),
      updatedAt: m.updatedAt ? m.updatedAt.toDate().toISOString() : null,
      updatedBy: m.updatedBy ?? null,
    };
  });
}
