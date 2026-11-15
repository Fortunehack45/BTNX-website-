import { test, describe } from "node:test";
import assert from "node:assert";
import http from "node:http";

// Import handler from mcp/api/mcp.ts
import mcpHandler from "../mcp/api/mcp.js";

function makeMockReqRes(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const req = {
    method: options.method,
    url: options.url,
    headers: {
      host: "localhost:3000",
      ...(options.headers || {}),
    },
    body: options.body,
  } as any;

  let statusCode = 200;
  const headers: Record<string, string> = {};
  let responseData = "";

  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    writeHead(code: number, hdrs?: Record<string, string>) {
      statusCode = code;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          headers[k.toLowerCase()] = v;
        }
      }
    },
    write(chunk: any) {
      responseData += chunk?.toString() || "";
    },
    end(chunk?: any) {
      if (chunk) responseData += chunk.toString();
    },
    getStatus() {
      return statusCode;
    },
    getHeaders() {
      return headers;
    },
    getBody() {
      return responseData;
    },
    getJson() {
      try {
        return JSON.parse(responseData);
      } catch {
        return null;
      }
    },
  } as any;

  return { req, res };
}

describe("BTNX MCP Streamable HTTP & Protocol Compliance Suite", () => {
  test("MCP initialize lifecycle should negotiate protocol and establish mcp-session-id header", async () => {
    const { req, res } = makeMockReqRes({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: {
        jsonrpc: "2.0",
        id: 101,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      },
    });

    await mcpHandler(req, res);

    assert.strictEqual(res.getStatus(), 200);
    const headers = res.getHeaders();
    assert.ok(headers["mcp-session-id"], "Response must include mcp-session-id header");
    assert.ok(headers["mcp-session-id"].startsWith("mcp_sess_"), "Session ID must start with mcp_sess_");

    const json = res.getJson();
    assert.ok(json, "Response must be valid JSON-RPC");
    assert.strictEqual(json.jsonrpc, "2.0");
    assert.strictEqual(json.id, 101);
    assert.strictEqual(json.result.protocolVersion, "2024-11-05");
    assert.ok(json.result.serverInfo);
    assert.strictEqual(json.result.serverInfo.name, "BTNX Store Remote MCP");
  });

  test("MCP notifications/initialized must return 202 Accepted with empty body (no invalid JSON-RPC response)", async () => {
    const { req, res } = makeMockReqRes({
      method: "POST",
      url: "/mcp",
      headers: {
        "content-type": "application/json",
        "mcp-session-id": "mcp_sess_test1234567890123456",
      },
      body: {
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {},
      },
    });

    await mcpHandler(req, res);

    assert.strictEqual(res.getStatus(), 202, "Notifications must return 202 Accepted");
    assert.strictEqual(res.getBody(), "", "Notification response body must be empty");
  });

  test("MCP tools/list must return full catalog containing all 25 tools", async () => {
    const { req, res } = makeMockReqRes({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: {
        jsonrpc: "2.0",
        id: 102,
        method: "tools/list",
        params: {},
      },
    });

    await mcpHandler(req, res);

    assert.strictEqual(res.getStatus(), 200);
    const json = res.getJson();
    assert.ok(json);
    assert.strictEqual(json.id, 102);
    assert.ok(Array.isArray(json.result.tools));

    const toolNames = json.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.length >= 25, `Expected at least 25 tools, got ${toolNames.length}`);

    // Verify key core tools exist
    assert.ok(toolNames.includes("btnx_list_products"));
    assert.ok(toolNames.includes("btnx_get_product_details"));
    assert.ok(toolNames.includes("btnx_calculate_order"));
    assert.ok(toolNames.includes("btnx_create_customer_order"));
    assert.ok(toolNames.includes("btnx_list_my_orders"));
    assert.ok(toolNames.includes("btnx_get_invoice"));
    assert.ok(toolNames.includes("btnx_track_parcel"));
    assert.ok(toolNames.includes("btnx_recommend_fit"));
    assert.ok(toolNames.includes("btnx_message_support"));
    assert.ok(toolNames.includes("btnx_get_support_ticket"));
    assert.ok(toolNames.includes("btnx_get_shipping_destinations"));
    assert.ok(toolNames.includes("btnx_create_personal_access_token"));
    assert.ok(toolNames.includes("btnx_list_personal_access_tokens"));
    assert.ok(toolNames.includes("btnx_revoke_personal_access_token"));
    assert.ok(toolNames.includes("btnx_initiate_whatsapp_linking"));
    assert.ok(toolNames.includes("btnx_verify_whatsapp_linking"));
    assert.ok(toolNames.includes("btnx_unlink_whatsapp"));
  });

  test("MCP tools/call for public tool (btnx_get_shipping_destinations) succeeds with isError: false", async () => {
    const { req, res } = makeMockReqRes({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: {
        jsonrpc: "2.0",
        id: 103,
        method: "tools/call",
        params: {
          name: "btnx_get_shipping_destinations",
          arguments: {},
        },
      },
    });

    await mcpHandler(req, res);

    assert.strictEqual(res.getStatus(), 200);
    const json = res.getJson();
    assert.ok(json);
    assert.strictEqual(json.id, 103);
    assert.strictEqual(json.result.isError, false);
    assert.ok(json.result.content[0].text.includes("Lagos"));
    assert.ok(json.result.content[0].text.includes("Osogbo"));
  });

  test("MCP tools/call for private tool without auth returns isError: true and auth requirement", async () => {
    const { req, res } = makeMockReqRes({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: {
        jsonrpc: "2.0",
        id: 104,
        method: "tools/call",
        params: {
          name: "btnx_create_personal_access_token",
          arguments: { name: "Unauthorized Test Token" },
        },
      },
    });

    await mcpHandler(req, res);

    assert.strictEqual(res.getStatus(), 200);
    const json = res.getJson();
    assert.ok(json);
    assert.strictEqual(json.id, 104);
    assert.strictEqual(json.result.isError, true);
    assert.ok(json.result.content[0].text.includes("Authentication required"));
  });

  test("MCP ping should return valid pong result", async () => {
    const { req, res } = makeMockReqRes({
      method: "POST",
      url: "/mcp",
      headers: { "content-type": "application/json" },
      body: {
        jsonrpc: "2.0",
        id: 105,
        method: "ping",
      },
    });

    await mcpHandler(req, res);

    assert.strictEqual(res.getStatus(), 200);
    const json = res.getJson();
    assert.ok(json);
    assert.strictEqual(json.id, 105);
    assert.deepStrictEqual(json.result, {});
  });

  test.after(() => {
    setTimeout(() => process.exit(0), 100);
  });
});
