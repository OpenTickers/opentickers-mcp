import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenTickersClient } from "../client.js";
import { readOnlyAnnotations, runApiTool } from "./helpers.js";

const ALLOWED_RATE_FIELDS = [
  "id",
  "effectiveDate",
  "sourceCode",
  "baseCurrency",
  "quoteCurrency",
  "type",
  "value",
  "scalingFactor",
  "externalId",
  "inverted",
  "startDate",
  "endDate",
  "sampleCount",
] as const;

const CsvOptionsInput = z
  .object({
    delimiter: z
      .enum([",", ";", "\t", "|"])
      .optional()
      .describe('CSV column delimiter (use ";" for European SAP CSV export)'),
    decimalSeparator: z
      .enum([".", ","])
      .optional()
      .describe('Decimal separator (use "," for European SAP CSV export)'),
    includeHeader: z
      .boolean()
      .optional()
      .describe("Whether to include the header row (default: true)"),
  })
  .optional()
  .describe("Formatting options when format is csv or text");

export function registerExchangeRateTools(server: McpServer, client: OpenTickersClient) {
  server.registerTool(
    "get_latest_exchange_rates",
    {
      title: "Get Latest Exchange Rates",
      description:
        "Fetch the latest currency exchange rates. Available on all plans (including free). At least one of base_currency, quote_currency, or source_code must be provided.",
      inputSchema: {
        base_currency: z.string().optional().describe("Base ISO currency code (e.g. USD, EUR)"),
        quote_currency: z.string().optional().describe("Quote ISO currency code (e.g. BRL, ZAR)"),
        source_code: z.string().optional().describe("Data source code (e.g. ecb, sarb, nbp, bcb)"),
        type: z.string().optional().describe("Rate type filter (e.g. close, mid, buy, sell)"),
      },
      annotations: readOnlyAnnotations("Get Latest Exchange Rates"),
    },
    async (args) =>
      runApiTool(async () => {
        if (!args.base_currency && !args.quote_currency && !args.source_code) {
          throw new Error(
            "At least one of base_currency, quote_currency, or source_code must be provided.",
          );
        }
        return client.request("/api/public/exchange_rates/latest", { query: args });
      }),
  );

  server.registerTool(
    "get_historical_exchange_rates",
    {
      title: "Get Historical Exchange Rates",
      description:
        "Fetch historical currency exchange rates over a date range with pagination. Requires a Pro or Partner plan.",
      inputSchema: {
        start_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .describe("Start date in YYYY-MM-DD format"),
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .describe("End date in YYYY-MM-DD format"),
        base_currency: z.string().optional().describe("Base ISO currency filter"),
        quote_currency: z.string().optional().describe("Quote ISO currency filter"),
        source_code: z.string().optional().describe("Data source code filter"),
        type: z.string().optional().describe("Rate type filter"),
        limit: z.number().int().min(1).max(1000).optional().describe("Max records (1-1000, default 100)"),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
      },
      annotations: readOnlyAnnotations("Get Historical Exchange Rates"),
    },
    async (args) =>
      runApiTool(() =>
        client.request("/api/public/exchange_rates/historical", { query: args }),
      ),
  );

  server.registerTool(
    "query_exchange_rates",
    {
      title: "Query Exchange Rates",
      description:
        "Advanced batch query for exchange rates supporting mixed series IDs and currency pairs, automatic smart inversion (1/x), point-in-time as_of snapshots with lookback, period averages, field projection, and JSON or SAP CSV export. Requires a Pro or Partner plan.",
      inputSchema: {
        mode: z
          .enum(["latest", "as_of", "historical", "average"])
          .default("latest")
          .describe("Query mode: latest, as_of (snapshot), historical (series), or average (mean)"),
        format: z
          .enum(["json", "csv", "text"])
          .default("json")
          .describe("Output format: json (default), csv (supports SAP CSV via csvOptions), or text"),
        asOfDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Target snapshot date YYYY-MM-DD (required when mode is as_of)"),
        lookbackDays: z
          .number()
          .int()
          .min(0)
          .max(30)
          .optional()
          .describe("Max lookback days for as_of mode (0-30, default 5)"),
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
          .array(z.enum(ALLOWED_RATE_FIELDS))
          .optional()
          .describe("Optional field projection list"),
        csvOptions: CsvOptionsInput,
        items: z
          .array(
            z.object({
              sourceCode: z.string().min(1).describe("Data source identifier (e.g. ecb, bcb)"),
              id: z.string().optional().describe("Direct series ID (e.g. USD_BRL_MID)"),
              baseCurrency: z.string().optional().describe("Base ISO currency (required if id omitted)"),
              quoteCurrency: z.string().optional().describe("Quote ISO currency (required if id omitted)"),
              type: z.string().optional().describe("Optional rate type (e.g. close, mid)"),
            }),
          )
          .min(1)
          .describe("One or more rate items (each needs id, or baseCurrency + quoteCurrency)"),
      },
      annotations: readOnlyAnnotations("Query Exchange Rates"),
    },
    async (args) =>
      runApiTool(() =>
        client.request("/api/public/exchange_rates/query", {
          method: "POST",
          body: args,
          rawText: args.format === "csv" || args.format === "text",
        }),
      ),
  );
}
