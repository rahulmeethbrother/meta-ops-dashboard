import "server-only";

type JsonRpcResponse = {
  result?: unknown;
  error?: { code?: number; message?: string };
};

const MCP_URL = process.env.PIPEBOARD_MCP_URL || "https://meta-ads.mcp.pipeboard.co/";
const MCP_TOKEN = process.env.PIPEBOARD_MCP_TOKEN;

function endpoint() {
  if (!MCP_TOKEN) throw new Error("PIPEBOARD_MCP_TOKEN is not configured");
  const url = new URL(MCP_URL);
  url.searchParams.set("token", MCP_TOKEN);
  return url.toString();
}

function parseResponse(text: string): JsonRpcResponse {
  const lastData = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .pop();
  return JSON.parse(lastData || text) as JsonRpcResponse;
}

async function postRpc(body: object, sessionId?: string) {
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Pipeboard MCP ${response.status}: ${text.slice(0, 500)}`);
  return { response: parseResponse(text), sessionId: response.headers.get("mcp-session-id") || sessionId };
}

export async function callPipeboardTool(name: string, arguments_: Record<string, unknown>) {
  const initialized = await postRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "company-studio-meta-ops", version: "1.0.0" },
    },
  });
  const called = await postRpc(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name, arguments: arguments_ },
    },
    initialized.sessionId,
  );
  if (called.response.error) throw new Error(called.response.error.message || "Pipeboard MCP request failed");
  return called.response.result;
}
