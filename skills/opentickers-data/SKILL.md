---
name: opentickers-data
description: >-
  Use this skill when querying authoritative central bank exchange rates, historical FX
  series, financial indicators (policy rates, interbank benchmarks, yields), or generating
  SAP-compatible CSV exports for SAP S/4HANA, SAP Joule, or treasury/FI workflows via the
  OpenTickers MCP server.
---

# OpenTickers Data Workflow

Use the `opentickers` MCP server tools (`https://mcp.opentickers.com/mcp`) to retrieve authoritative central bank exchange rates and financial indicators, including SAP-compatible CSV exports for treasury, finance, and S/4HANA workflows.

## 0. Connecting the MCP Server (If Not Already Configured)

If the `opentickers` MCP tools are not yet available in the session, guide the user to connect the hosted Streamable HTTP endpoint (`https://mcp.opentickers.com/mcp`) with an API key from [opentickers.com](https://opentickers.com):

* **SAP Joule Studio (SAP BTP):** Create an HTTP Destination in **SAP BTP Cockpit → Connectivity → Destinations** pointing to `https://mcp.opentickers.com/mcp` (`Authentication: NoAuthentication`) with additional properties `sap-joule-studio-mcp-server = true` and `URL.headers.Authorization = Bearer <OPENTICKERS_API_KEY>`, then add the destination under **Tools** in your Joule Studio agent.
* **Generic MCP clients (Claude Code, Cursor, VS Code, Windsurf, Antigravity, Gemini CLI):** Add a Streamable HTTP MCP server at `https://mcp.opentickers.com/mcp` with header `Authorization: Bearer <OPENTICKERS_API_KEY>`.

## 1. Discover Sources & Catalogs First

When the exact source code or indicator slug is unknown, query the reference endpoints before fetching rates or indicators:

* Call `list_sources` (optionally with `include_rates: true` or `include_indicators: true`, or filtered by `country`/`region`) to discover central bank source codes (e.g., `ecb`, `bcb`, `sarb`, `nbp`).
* Call `list_currencies` to confirm supported ISO 4217 currency codes.
* Call `list_financial_indicator_categories` and `list_financial_indicator_catalog` to discover valid `indicator_code` and `category` values before calling indicator queries.

## 2. Choose the Right Query Tool

* **Latest snapshot (Free & Paid):**
  * FX: `get_latest_exchange_rates` (requires at least one of `base_currency`, `quote_currency`, or `source_code`).
  * Indicators: `get_latest_financial_indicators` (requires at least one of `indicator_code`, `category`, or `source_code`).
* **Historical date range (Pro / Partner):**
  * Simple paginated ranges: `get_historical_exchange_rates` / `get_historical_financial_indicators` (`YYYY-MM-DD`).
* **Batch queries, `as_of` snapshots, averages, smart inversion, or SAP CSV export (Pro / Partner):**
  * Use `query_exchange_rates` or `query_financial_indicators`.
  * For point-in-time valuation dates that may fall on weekends or holidays, use `mode: "as_of"` with `asOfDate` and `lookbackDays`.
  * For European / SAP CSV uploads, pass `format: "csv"` with `csvOptions: { delimiter: ";", decimalSeparator: ",", includeHeader: true }`.

## 3. Handling Auth or Plan Errors

* **401 Unauthorized:** Remind the user to configure `OPENTICKERS_API_KEY` (obtained from https://opentickers.com) in their MCP client (`Authorization: Bearer <key>`), SAP BTP Destination (`URL.headers.Authorization`), or plugin setup dialog.
* **403 Forbidden:** Explain that historical and batch query endpoints require a Pro or Partner plan and surface the upgrade link returned by the tool; offer to fall back to `get_latest_*` tools for latest rates/indicators.
