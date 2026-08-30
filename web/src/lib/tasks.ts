// Cloud Tasks integration: one task per render item, delivered to the Cloud
// Run renderer with an OIDC token of the dedicated invoker service account.
// The queue provides buffering, per-second dispatch limits, bounded
// concurrency and automatic retries with backoff -- bulk submissions never
// block this API layer or overwhelm the renderer.

import "server-only";
import { CloudTasksClient } from "@google-cloud/tasks";
import { gcpProject, serviceAccount } from "./firebase-admin";

let client: CloudTasksClient | null = null;

function tasksClient(): CloudTasksClient {
  if (!client) {
    const sa = serviceAccount();
    client = new CloudTasksClient({
      projectId: gcpProject(),
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
    });
  }
  return client;
}

export async function enqueueRenderTask(jobId: string, itemId: string): Promise<string> {
  const location = process.env.TASKS_LOCATION || "us-central1";
  const queue = process.env.TASKS_QUEUE || "render-queue";
  const rendererUrl = process.env.RENDERER_URL;
  const invokerSa = process.env.TASKS_INVOKER_SA;
  if (!rendererUrl || !invokerSa) {
    throw new Error("RENDERER_URL / TASKS_INVOKER_SA env vars are not set");
  }

  const parent = tasksClient().queuePath(gcpProject(), location, queue);
  const [task] = await tasksClient().createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url: `${rendererUrl.replace(/\/$/, "")}/render`,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify({ jobId, itemId })).toString("base64"),
        oidcToken: { serviceAccountEmail: invokerSa, audience: rendererUrl },
      },
      // Give a single render up to 30 minutes per delivery attempt
      // (Cloud Tasks maximum for HTTP targets).
      dispatchDeadline: { seconds: 1800 },
    },
  });
  return task.name ?? "";
}
