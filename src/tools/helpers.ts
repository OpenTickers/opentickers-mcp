import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { OpenTickersApiError } from "../client.js";

export type McpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

/**
 * Standard MCP tool annotations for read-only OpenTickers API queries.
 */
export function readOnlyAnnotations(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  };
}

/**
 * Executes an OpenTickers API call and formats the result (JSON or raw CSV/text)
 * as an MCP tool response, normalizing API errors into clear agent-readable messages.
 */
export async function runApiTool(fn: () => Promise<unknown>): Promise<McpToolResult> {
  try {
    const result = await fn();
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return {
      content: [{ type: "text", text }],
    };
  } catch (err) {
    if (err instanceof OpenTickersApiError) {
      return {
        isError: true,
        content: [{ type: "text", text: `[${err.code} (${err.status})] ${err.message}` }],
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: "text", text: `Unexpected error calling OpenTickers API: ${message}` }],
    };
  }
}
