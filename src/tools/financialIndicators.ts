import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenTickersClient } from "../client.js";
import { readOnlyAnnotations, runApiTool } from "./helpers.js";

const ALLOWED_INDICATOR_FIELDS = [
  "id",
  "effectiveDate",
  "sourceCode",
  "indicatorCode",
  "category",
  "unit",
  "currency",
  "tenor",
  "type",
  "externalId",
  "value",
  "scalingFactor",
  "createdAt",
  "startDate",
  "endDate",
  "sampleCount",
] as const;

export function registerFinancialIndicatorTools(server: McpServer, client: OpenTickersClient) {
  server.registerTool(
    "get_latest_financial_indicators",
    {
      title: "Get Latest Financial Indicators",
      description:
        "Fetch the latest financial indicators (e.g. interbank rates, policy rates, yields). Available on all plans. At least one of indicator_code, category, or source_code must be provided.",
      inputSchema: {
        indicator_code: z.string().optional().describe("Indicator slug (e.g. OVERNIGHT_ESTR)"),
        category: z.string().optional().describe("Indicator category (e.g. interbank_rate)"),
        source_code: z.string().optional().describe("Data source code (e.g. ECB, FED, BCB)"),
        currency: z.string().optional().describe("Currency filter (e.g. EUR, USD)"),
        tenor: z.string().optional().describe("Tenor/maturity filter (e.g. overnight, 3M)"),
        type: z.string().optional().describe("Indicator subtype filter (e.g. benchmark)"),
      },
      annotations: readOnlyAnnotations("Get Latest Financial Indicators"),
    },
    async (args) =>
      runApiTool(async () => {
        if (!args.indicator_code && !args.category && !args.source_code) {
          throw new Error(
            "At least one of indicator_code, category, or source_code must be provided.",
          );
        }
        return client.request("/api/public/financial_indicators/latest", { query: args });
      }),
  );

  server.registerTool(
    "get_historical_financial_indicators",
    {
      title: "Get Historical Financial Indicators",
      description:
        "Fetch historical financial indicator observations over a date range. Requires a Pro or Partner plan.",
      inputSchema: {
        start_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .describe("Start date YYYY-MM-DD"),
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .describe("End date YYYY-MM-DD"),
        indicator_code: z.string().optional().describe("Indicator code filter"),
        category: z.string().optional().describe("Category filter"),
        source_code: z.string().optional().describe("Data source code filter"),
        currency: z.string().optional().describe("Currency filter"),
        tenor: z.string().optional().describe("Tenor filter"),
        type: z.string().optional().describe("Subtype filter"),
        limit: z.number().int().min(1).max(1000).optional().describe("Max records (1-1000, default 100)"),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
      },
      annotations: readOnlyAnnotations("Get Historical Financial Indicators"),
    },
    async (args) =>
      runApiTool(() =>
        client.request("/api/public/financial_indicators/historical", { query: args }),
      ),
  );

  server.registerTool(
    "query_financial_indicators",
    {
      title: "Query Financial Indicators",
      description:
        "Advanced batch query for financial indicators supporting latest, as_of snapshots, historical series, averages, field selection, and JSON or CSV export. Requires a Pro or Partner plan.",
      inputSchema: {
        mode: z
          .enum(["latest", "as_of", "historical", "average"])
          .default("latest")
          .describe("Query mode: latest, as_of, historical, or average"),
        format: z
          .enum(["json", "csv", "text"])
          .default("json")
          .describe("Output format: json (default), csv, or text"),
        asOfDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Target snapshot date YYYY-MM-DD (required for as_of mode)"),
        lookbackDays: z
          .number()
          .int()
          .min(0)
          .max(90)
          .optional()
          .describe("Max lookback days for as_of mode (0-90, default 30)"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Start date YYYY-MM-DD (required for historical and average modes)"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("End date YYYY-MM-DD (required for historical and average modes)"),
        fields: z
          .array(z.enum(ALLOWED_INDICATOR_FIELDS))
          .optional()
          .describe("Optional field projection list"),
        csvOptions: z
          .object({
            delimiter: z.enum([",", ";", "\t", "|"]).optional(),
            decimalSeparator: z.enum([".", ","]).optional(),
            includeHeader: z.boolean().optional(),
          })
          .optional()
          .describe("Formatting options when format is csv or text"),
        items: z
          .array(
            z.object({
              sourceCode: z.string().min(1).describe("Data source identifier (e.g. ECB)"),
              indicatorCode: z.string().optional().describe("Standardized indicator slug"),
              id: z.string().optional().describe("Direct composite ID (e.g. ECB_OVERNIGHT_ESTR)"),
              category: z.string().optional().describe("Indicator category filter"),
              tenor: z.string().optional().describe("Tenor filter"),
              type: z.string().optional().describe("Subtype filter"),
            }),
          )
          .min(1)
          .describe("One or more indicator items (each needs id or indicatorCode)"),
      },
      annotations: readOnlyAnnotations("Query Financial Indicators"),
    },
    async (args) =>
      runApiTool(() =>
        client.request("/api/public/financial_indicators/query", {
          method: "POST",
          body: args,
          rawText: args.format === "csv" || args.format === "text",
        }),
      ),
  );

  server.registerTool(
    "list_financial_indicator_catalog",
    {
      title: "List Financial Indicator Catalog",
      description:
        "List available financial indicator definitions in the catalog, optionally filtered by source, category, currency, or tenor.",
      inputSchema: {
        source_code: z.string().optional().describe("Filter by source code"),
        category: z.string().optional().describe("Filter by category"),
        currency: z.string().optional().describe("Filter by currency"),
        tenor: z.string().optional().describe("Filter by tenor"),
      },
      annotations: readOnlyAnnotations("List Financial Indicator Catalog"),
    },
    async (args) =>
      runApiTool(() =>
        client.request("/api/public/financial_indicators/catalog", { query: args }),
      ),
  );

  server.registerTool(
    "list_financial_indicator_categories",
    {
      title: "List Financial Indicator Categories",
      description: "List all available financial indicator categories.",
      annotations: readOnlyAnnotations("List Financial Indicator Categories"),
    },
    async () =>
      runApiTool(() => client.request("/api/public/financial_indicators/categories")),
  );
}
