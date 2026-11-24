# OpenTickers MCP Server

Hosted **Streamable HTTP** [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the **[OpenTickers](https://opentickers.com)** central bank exchange rates and financial indicators API.

* **Hosted Endpoint:** `https://mcp.opentickers.com/mcp`
* **Transport:** Stateless Streamable HTTP (`POST /mcp`)
* **Authentication:** Per-request `Authorization: Bearer <OPENTICKERS_API_KEY>` (get an API key at [opentickers.com](https://opentickers.com))
* **Safety:** All 10 tools are strictly read-only (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`)

## Available Tools

| Tool | Description | Plan |
| --- | --- | --- |
| `get_latest_exchange_rates` | Fetch latest currency exchange rates by base/quote currency or central bank source | Free & Paid |
| `get_historical_exchange_rates` | Fetch historical FX rates over a date range with pagination | Pro / Partner |
| `query_exchange_rates` | Batch FX query with smart inversion (`1/x`), `as_of` snapshots, averages, field projection, and JSON or SAP CSV export | Pro / Partner |
| `get_latest_financial_indicators` | Fetch latest interbank rates, policy rates, yields, and macro indicators | Free & Paid |
| `get_historical_financial_indicators` | Fetch historical financial indicator series over a date range | Pro / Partner |
| `query_financial_indicators` | Batch indicator query supporting `latest`, `as_of`, `historical`, `average`, field projection, and JSON/CSV export | Pro / Partner |
| `list_financial_indicator_catalog` | Browse available financial indicator definitions filtered by source, category, currency, or tenor | Free & Paid |
| `list_financial_indicator_categories` | List all available financial indicator categories | Free & Paid |
| `list_sources` | List available central bank and official data sources with optional pair/indicator coverage | Free & Paid |
| `list_currencies` | List all supported ISO currency codes | Free & Paid |

*Note: `query_exchange_rates` and `query_financial_indicators` support `format: "csv"` with configurable `csvOptions` (`delimiter: ";"`, `decimalSeparator: ","`, `includeHeader`) for SAP / SAP Joule workflows.*

## Connecting an MCP Client

Create an API key at **[opentickers.com](https://opentickers.com)**, then configure your client:

### Generic MCP Config (Cursor, Windsurf, VS Code, etc.)

```json
{
  "mcpServers": {
    "opentickers": {
      "url": "https://mcp.opentickers.com/mcp",
      "headers": {
        "Authorization": "Bearer ot_your_api_key_here"
      }
    }
  }
}
```

### Google Antigravity (`agy`)

Install directly from GitHub as a native Antigravity plugin (bundles the `opentickers` remote MCP server, credential prompt for `OPENTICKERS_API_KEY`, and the `opentickers-data` skill):

```bash
agy plugin install https://github.com/OpenTickers/opentickers-mcp
```

Then enable it via `/plugin` in the CLI (or **Customizations → Installed** in the Antigravity App) to enter your OpenTickers API key.

### Claude Code

```bash
claude mcp add --transport http opentickers https://mcp.opentickers.com/mcp \
  --header "Authorization: Bearer ot_your_api_key_here"
```

### Gemini CLI

Install directly as a Gemini CLI extension (uses `gemini-extension.json`, which prompts securely for `OPENTICKERS_API_KEY` and stores it in your system keychain):

```bash
gemini extensions install https://github.com/OpenTickers/opentickers-mcp
```

Or add the remote MCP server directly:

```bash
gemini mcp add --transport http opentickers https://mcp.opentickers.com/mcp \
  --header "Authorization: Bearer ot_your_api_key_here"
```

## Self-Hosting & Local Development

### Prerequisites

* [Bun](https://bun.sh/) (v1.1+)
* A running OpenTickers API backend (configured via `OPENTICKERS_API_URL`)

### Run Locally

```bash
bun install
cp .env.example .env
# Edit .env if your API is on http://localhost:3000 instead of http://api:3000
bun run dev
```

### Run with Docker

Ensure the shared Docker network (`onerate-network`) exists alongside the API container:

```bash
cp .env.example .env
docker compose up -d --build
```

The server listens on `http://127.0.0.1:29473` (`POST /mcp`, `GET /health`). Place it behind a TLS reverse proxy for public HTTPS access.

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `29473` | HTTP port to listen on |
| `OPENTICKERS_API_URL` | `http://api:3000` | Base URL of the OpenTickers REST API |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |

## Testing

```bash
bun test
```

## Publishing to MCP Registries

### Official MCP Registry (`registry.modelcontextprotocol.io`)

`server.json` conforms to the `2025-12-11` MCP Registry schema under the `io.github.opentickers/opentickers` namespace.

```bash
mcp-publisher validate
# Org namespaces require a PAT with read:org (classic) or Org Members: Read-only (fine-grained)
mcp-publisher login github --token <GITHUB_PAT>
mcp-publisher publish
```

*(Alternatively, set `"name": "com.opentickers/opentickers"` in `server.json` and authenticate with `mcp-publisher login dns --domain opentickers.com`.)*

### Antigravity Marketplace (`antigravity-plugins-official`)

`plugin.json`, `mcp_config.json`, `assets/logo.svg`, and `skills/opentickers-data/SKILL.md` form a native Antigravity plugin bundle.

1. Validate locally with zero errors/warnings:
   ```bash
   agy plugin validate --strict
   ```
2. Submit the repository through the [Antigravity Marketplace partner intake form](https://forms.gle/2EX5RFYPoJe1UgxR9) (docs: https://antigravity.google/docs/build-plugins).

### Gemini CLI Extension Gallery

1. Add the repository topic **`gemini-cli-extension`** on GitHub (`About` → gear icon).
2. Publish a GitHub Release (e.g. `v1.0.0`). The Gemini CLI gallery crawler indexes it automatically.
