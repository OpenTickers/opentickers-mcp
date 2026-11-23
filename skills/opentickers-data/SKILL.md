---
name: opentickers-data
description: >-
  Use this skill when querying central bank exchange rates, historical FX series,
  financial indicators (policy rates, interbank benchmarks, yields), or generating
  SAP-compatible CSV exports with the OpenTickers MCP server.
---

# OpenTickers Data Workflow

Use the `opentickers` MCP server tools to retrieve authoritative central bank exchange rates and financial indicators.

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
* **Batch queries, `as_of` snapshots, averages, smart inversion, or CSV export (Pro / Partner):**
  * Use `query_exchange_rates` or `query_financial_indicators`.
  * For point-in-time valuation dates that may fall on weekends or holidays, use `mode: "as_of"` with `asOfDate` and `lookbackDays`.
  * For European / SAP CSV uploads, pass `format: "csv"` with `csvOptions: { delimiter: ";", decimalSeparator: ",", includeHeader: true }`.

## 3. Handling Auth or Plan Errors

* **401 Unauthorized:** Remind the user to configure `OPENTICKERS_API_KEY` (obtained from https://opentickers.com) in the Antigravity plugin setup dialog (**Customizations → Installed** or `/plugin`) or verify their `Authorization: Bearer <key>` header.
* **403 Forbidden:** Explain that historical and batch query endpoints require a Pro or Partner plan and surface the upgrade link returned by the tool; offer to fall back to `get_latest_*` tools for latest rates/indicators.
