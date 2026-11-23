import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index.js";

function mcpHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

describe("opentickers-mcp", () => {
  test("GET /health returns 200 ok", async () => {
    const app = createApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "opentickers-mcp" });
  });

  test("POST /mcp without Authorization header returns 401", async () => {
    const app = createApp();
    const res = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders(),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  test("GET and DELETE /mcp return 405 Method Not Allowed with Allow: POST", async () => {
    const app = createApp();

    const getRes = await app.request("/mcp", {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: "Bearer ot_test_key",
      },
    });
    expect(getRes.status).toBe(405);
    expect(getRes.headers.get("allow")).toBe("POST");
    const getBody = (await getRes.json()) as { error: { code: number; message: string } };
    expect(getBody.error.code).toBe(-32000);

    const deleteRes = await app.request("/mcp", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer ot_test_key",
      },
    });
    expect(deleteRes.status).toBe(405);
    expect(deleteRes.headers.get("allow")).toBe("POST");
  });

  test("tools/list returns all 10 OpenTickers tools with read-only annotations", async () => {
    const app = createApp();
    const res = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders("ot_test_key"),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: {
        tools: Array<{
          name: string;
          title?: string;
          annotations?: {
            title?: string;
            readOnlyHint?: boolean;
            destructiveHint?: boolean;
            idempotentHint?: boolean;
            openWorldHint?: boolean;
          };
        }>;
      };
    };
    const names = body.result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_historical_exchange_rates",
      "get_historical_financial_indicators",
      "get_latest_exchange_rates",
      "get_latest_financial_indicators",
      "list_currencies",
      "list_financial_indicator_catalog",
      "list_financial_indicator_categories",
      "list_sources",
      "query_exchange_rates",
      "query_financial_indicators",
    ]);

    for (const tool of body.result.tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toEqual({
        title: tool.title,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    }
  });

  test("forwards Bearer token and returns SAP CSV from query_exchange_rates", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    let capturedBody = "";

    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("Authorization") ?? "";
      capturedBody = String(init?.body ?? "");

      return new Response("sourceCode;baseCurrency;quoteCurrency;value\necb;USD;EUR;0,92", {
        status: 200,
        headers: { "content-type": "text/csv; charset=utf-8" },
      });
    }) as typeof fetch;

    const app = createApp({ apiUrl: "http://api:3000", fetchImpl: mockFetch });
    const res = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders("ot_user_123"),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "query_exchange_rates",
          arguments: {
            mode: "latest",
            format: "csv",
            csvOptions: {
              delimiter: ";",
              decimalSeparator: ",",
              includeHeader: true,
            },
            items: [{ sourceCode: "ecb", baseCurrency: "USD", quoteCurrency: "EUR" }],
          },
        },
      }),
    });

    expect(res.status).toBe(200);
    expect(capturedUrl).toBe("http://api:3000/api/public/exchange_rates/query");
    expect(capturedAuth).toBe("Bearer ot_user_123");
    expect(JSON.parse(capturedBody).format).toBe("csv");

    const body = (await res.json()) as {
      result: { content: Array<{ type: string; text: string }>; isError?: boolean };
    };
    expect(body.result.isError).toBeUndefined();
    expect(body.result.content[0]?.text).toContain("ecb;USD;EUR;0,92");
  });

  test("surfaces 403 plan errors cleanly as MCP tool errors", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "This endpoint requires a pro or partner plan.",
          upgradeUrl: "https://opentickers.com/#pricing",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      )) as typeof fetch;

    const app = createApp({ apiUrl: "http://api:3000", fetchImpl: mockFetch });
    const res = await app.request("/mcp", {
      method: "POST",
      headers: mcpHeaders("ot_free_key"),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "get_historical_exchange_rates",
          arguments: {
            start_date: "2026-01-01",
            end_date: "2026-01-10",
            base_currency: "USD",
          },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { content: Array<{ type: string; text: string }>; isError?: boolean };
    };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0]?.text).toContain("[Forbidden (403)]");
    expect(body.result.content[0]?.text).toContain("https://opentickers.com/#pricing");
  });
});
