# Dashboard Contract: India Flow Metrics

This document defines the schema, queries, update cadence, and UI expectations for the FII/DII net flow absorption metrics materialized inside Railway PostgreSQL.

The dashboard repository reads from this table directly.

---

## Schema & Column Definitions

### Table: `india_flow_metrics`

Materialized daily after market close. Contains one row per trading day.

| Column | SQL Type | Description |
|---|---|---|
| `as_of_date` | `DATE` | Primary Key. The trading day represented by this metric snapshot. |
| `month_start` | `DATE` | First day of the calendar month for the snapshot (used for filtering/grouping). |
| `mtd_fii_net` | `DECIMAL(14,2)` | Sum of FII cash segment net flow (₹ crore) MTD through `as_of_date`. |
| `mtd_dii_net` | `DECIMAL(14,2)` | Sum of DII cash segment net flow (₹ crore) MTD through `as_of_date`. |
| `absorption_ratio` | `DECIMAL(8,2)` | Ratio of DII buying offset to FPI/FII selling. `NULL` when undefined. |
| `status` | `TEXT` | Status string representing market condition. See Enum Values below. |
| `trading_days_mtd` | `SMALLINT` | Number of trading days evaluated this month so far. |
| `computed_at` | `TIMESTAMPTZ` | Timestamp when this row was materialized. |

### Status Enum Values (`status`)

- `absorbing`: `absorption_ratio > 1.0` (Domestic buying fully offsets foreign selling).
- `partial`: `0 < absorption_ratio <= 1.0` (Some domestic support, but not full offset).
- `fpi_buying`: `mtd_fii_net >= 0` (FPI net buying — ratio undefined, show N/A).
- `no_domestic_support`: `mtd_dii_net <= 0` (No domestic net buying bid — ratio undefined).
- `insufficient_data`: Missing FII or DII MTD row (Collection gap / day-one state — show warning).

---

## Dashboard SQL Queries

Use these queries in the separate dashboard workspace to render UI components.

### KPI Card (Latest Snapshot)
```sql
-- Fetch the latest available metric row for KPI display
SELECT as_of_date, month_start, mtd_fii_net, mtd_dii_net,
       absorption_ratio, status, trading_days_mtd, computed_at
FROM india_flow_metrics
ORDER BY as_of_date DESC
LIMIT 1;
```

### Trend Chart (Current Month MTD Evolution)
```sql
-- Retrieve MTD evolution line chart data for the current calendar month
SELECT as_of_date, absorption_ratio, mtd_fii_net, mtd_dii_net, status
FROM india_flow_metrics
WHERE month_start = date_trunc('month', CURRENT_DATE)::date
ORDER BY as_of_date ASC;
```

### Trend Chart (Rolling Window - e.g., 90 Days)
```sql
-- Retrieve historical trend data for the 90-day chart range
SELECT as_of_date, absorption_ratio, mtd_fii_net, mtd_dii_net, status, month_start
FROM india_flow_metrics
WHERE as_of_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY as_of_date ASC;
```

---

## Lijo Prod Verification SQL
Use these queries directly on the production database to verify data health and pipeline correctness.

### 1. View vs Table Consistency
Checks that the live computed view and the daily materialized table match exactly on the latest date.
```sql
SELECT v.*, m.absorption_ratio AS table_ratio
FROM india_flow_absorption_v1 v
LEFT JOIN india_flow_metrics m USING (as_of_date);
```

### 2. DII Collection Health (Go/No-Go Gate)
Verifies if the daily cron is writing both FII and DII flows for the current month. If DII count is 0 or extremely low, check the Moneycontrol daily cron.
```sql
SELECT investor_type, COUNT(*) AS rows_this_month, MAX(flow_date) AS latest
FROM india_institutional_flows
WHERE flow_date >= date_trunc('month', CURRENT_DATE)
GROUP BY investor_type;
```

---

## UI Reference Specifications
For detailed layout specs, styling guides, threshold metrics (1.0 breakeven line), and fallback rules, refer to the **Dashboard Reference UI** section in the [V2-017c task document](../tasks/V2-017c_fii_dii_absorption_metrics.md).

---

## Pipeline Context & Constraints

- **Update Cadence**: Daily at approximately **19:30 IST** after market close, triggered automatically at the end of the `seed-india-flows.mjs` script execution.
- **Day-One Expectation**: The KPI card and trend chart may display `insufficient_data` until several days of forward collection containing both FII and DII flows accumulate. This is because historical NSDL backfill data is FII-only, leaving DII-related MTD fields empty for prior months.
- **Supersede Revisions**: Since `seed-india-flows.mjs` only refreshes the *latest* `as_of_date`, prior months' metrics will not auto-recompute if backfilled flows are revised (e.g. NSDL revisions). In such cases, Lijo must manually re-run `node scripts/backfill-india-flow-metrics.mjs` to refresh the entire table.
