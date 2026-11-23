import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenTickersClient } from "../client.js";
import { readOnlyAnnotations, runApiTool } from "./helpers.js";

export function registerReferenceTools(server: McpServer, client: OpenTickersClient) {
  server.registerTool(
    "list_sources",
    {
      title: "List Data Sources",
      description:
        "List available exchange rate and financial indicator data sources (central banks, etc.), with optional filters and available pairs/indicators.",
      inputSchema: {
        include_rates: z
          .boolean()
          .optional()
          .describe("Include available currency pairs for each source"),
        include_indicators: z
          .boolean()
          .optional()
          .describe("Include available financial indicators for each source"),
        code: z.string().optional().describe("Filter by specific source code"),
        region: z.string().optional().describe("Filter by geographic region"),
        country: z.string().optional().describe("Filter by country"),
        sort_by: z
          .enum(["name", "id", "code", "region", "country"])
          .optional()
          .describe("Field to sort by (default: name)"),
        order: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: asc)"),
      },
      annotations: readOnlyAnnotations("List Data Sources"),
    },
    async (args) =>
      runApiTool(() => client.request("/api/public/sources", { query: args })),
  );

  server.registerTool(
    "list_currencies",
    {
      title: "List Currencies",
      description: "List all supported ISO currencies available in OpenTickers.",
      annotations: readOnlyAnnotations("List Currencies"),
    },
    async () => runApiTool(() => client.request("/api/public/currencies")),
  );
}
