import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMcpServer } from "./mcp/server.js";

export interface AppConfig {
  apiUrl?: string;
  corsOrigin?: string;
  fetchImpl?: typeof fetch;
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export function createApp(config: AppConfig = {}) {
  const apiUrl = config.apiUrl ?? process.env.OPENTICKERS_API_URL ?? "http://api:3000";
  const corsOrigin = config.corsOrigin ?? process.env.CORS_ORIGIN ?? "*";

  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: corsOrigin,
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "mcp-session-id", "Last-Event-ID", "mcp-protocol-version"],
      exposeHeaders: ["mcp-session-id"],
    }),
  );

  app.get("/health", (c) => {
    return c.json({ status: "ok", service: "opentickers-mcp" }, 200);
  });

  app.get("/", (c) => {
    return c.json(
      {
        name: "opentickers-mcp",
        version: "1.0.0",
        mcpEndpoint: "/mcp",
        auth: "Pass your OpenTickers API key via the 'Authorization: Bearer <API_KEY>' header.",
      },
      200,
    );
  });

  app.post("/mcp", async (c) => {
    const apiKey = extractBearerToken(c.req.header("Authorization"));
    if (!apiKey) {
      return c.json(
        {
          error: "Unauthorized",
          message:
            "Missing OpenTickers API key. Configure your MCP client with header 'Authorization: Bearer <your_opentickers_api_key>'.",
        },
        401,
      );
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    const server = createMcpServer({
      apiKey,
      baseUrl: apiUrl,
      fetchImpl: config.fetchImpl,
    });

    await server.connect(transport);

    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      await transport.close();
      await server.close();
    }
  });

  // Stateless Streamable HTTP does not offer a standalone GET SSE stream or DELETE session teardown.
  app.all("/mcp", (c) => {
    c.header("Allow", "POST");
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      },
      405,
    );
  });

  return app;
}

const app = createApp();

export default {
  port: Number(process.env.PORT ?? 29473),
  fetch: app.fetch,
};
