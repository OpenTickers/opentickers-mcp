export class OpenTickersApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "OpenTickersApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  rawText?: boolean;
}

/**
 * Lightweight HTTP client for the OpenTickers (onerate_api) REST API.
 * Each instance is scoped to a single user's API key.
 */
export class OpenTickersClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: options.rawText ? "text/csv, text/plain, application/json" : "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchImpl(url.toString(), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw this.buildError(response.status, payload);
    }

    return payload as T;
  }

  private buildError(status: number, payload: unknown): OpenTickersApiError {
    const obj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : null;
    const apiError = typeof obj?.error === "string" ? obj.error : `HTTP ${status}`;
    const apiMessage =
      typeof obj?.message === "string"
        ? obj.message
        : typeof payload === "string" && payload.length > 0
          ? payload
          : "Request to OpenTickers API failed.";

    if (status === 401) {
      return new OpenTickersApiError(
        401,
        "Unauthorized",
        `Authentication failed (${apiMessage}). Verify your OpenTickers API key in your MCP client Authorization header.`,
        payload,
      );
    }

    if (status === 403) {
      const upgradeUrl = typeof obj?.upgradeUrl === "string" ? ` Upgrade at: ${obj.upgradeUrl}` : "";
      return new OpenTickersApiError(
        403,
        "Forbidden",
        `${apiMessage}${upgradeUrl}`,
        payload,
      );
    }

    if (status === 429) {
      return new OpenTickersApiError(
        429,
        "RateLimitExceeded",
        `Daily API rate limit exceeded: ${apiMessage}`,
        payload,
      );
    }

    return new OpenTickersApiError(status, apiError, apiMessage, payload);
  }
}
