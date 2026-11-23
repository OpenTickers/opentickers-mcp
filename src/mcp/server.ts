import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OpenTickersClient } from "../client.js";
import { registerExchangeRateTools } from "../tools/exchangeRates.js";
import { registerFinancialIndicatorTools } from "../tools/financialIndicators.js";
import { registerReferenceTools } from "../tools/reference.js";

export interface McpServerOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/**
 * Creates a request-scoped MCP server bound to a specific user's OpenTickers API key.
 */
export function createMcpServer({ apiKey, baseUrl, fetchImpl }: McpServerOptions): McpServer {
  const server = new McpServer({
    name: "opentickers-mcp",
    version: "1.0.0",
  });

  const client = new OpenTickersClient(baseUrl, apiKey, fetchImpl);

  registerExchangeRateTools(server, client);
  registerFinancialIndicatorTools(server, client);
  registerReferenceTools(server, client);

  return server;
}
