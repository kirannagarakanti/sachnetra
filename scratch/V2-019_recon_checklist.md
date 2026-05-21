# V2-019 Recon Checklist — RBI Weekly Statistical Supplement (WSS)

*Handoff for the Gemini/Antigravity browser agent. Run probes in `scratch/`, capture
raw output + sample files. Claude transcribes the confirmed cells into the V2-019
task file's Research Appendix — never runs these probes itself
(`feedback_external_agent_recon`).*

**Goal of recon**: confirm a headless, repeatable way to pull the **weekly**
system-level banking/monetary aggregates RBI publishes in the WSS, and — critically
— **whether a structured (CSV/XLS) source exists or it's PDF-only**. That single
answer decides the entire parser design. Same `runSeed()` separate-cron collector
shape as V2-017, but **weekly** cadence and a **wide macro table** (one row per
release date, one column per indicator) instead of a narrow event/flow table.

**The decisive question (resolve first)**: PDF-only → table-extract/OCR fork.
CSV/XLS or a queryable API → clean parse. Find the cleanest structured path before
anything else.

---

## Part A — The structured-data path (PREFERRED — probe FIRST)

RBI runs **DBIE (Database on Indian Economy)** — a structured statistics portal that
often exposes the same series as downloadable CSV/XLS. If a stable WSS download or
DBIE series exists, it supersedes PDF parsing entirely.

### A1. Find the structured source
- [x] Locate the WSS landing page on `rbi.org.in` (likely under
  *Publications → Weekly → Weekly Statistical Supplement*). Record the exact URL.
- [x] Does the WSS page offer a **CSV / XLS / data download** alongside the PDF?
  Capture the download URL + a sample file → `scratch/rbi_wss_sample.<ext>`.
- [x] Probe **DBIE** (`dbie.rbi.org.in` / the "Database on Indian Economy" portal)
  for the same series (bank credit, deposits, currency in circulation, reserve
  money, forex reserves, M3). Is there a direct CSV/XLS export or a query API?
  Record any stable download URL + sample.
- [x] Is there a **machine-readable / API** endpoint (JSON/XML) anywhere in the
  WSS or DBIE stack? Record status + shape if so.

### A2. URL stability
- [x] Is the file URL **fixed** (same link, content updated weekly) or **dated /
  per-release** (URL changes every Friday)? If dated, capture the **pattern**
  (e.g. embeds the release date or a sequential id) so the collector can build it.
- [x] If there's a "latest WSS" permalink that always points to the newest release,
  record it — that's the ideal collector target.

### A3. Access mechanics
- [x] Does plain Node `fetch()` retrieve the file/page, or does `rbi.org.in` gate
  with cookies / a warm-up / anti-bot (like NSE)? Record HTTP status for a bare
  `fetch()` with a Chrome UA.
- [x] Any required headers (UA, Referer, Accept)? Record the working combination.

---

## Part B — The PDF path (FALLBACK — only if no structured source)

If A turns up nothing structured, recon the PDF so the task can scope a parser.

- [x] Capture a real WSS PDF → `scratch/rbi_wss_sample.pdf`. Record the file URL
  + whether the URL is dated (Part A2).
- [x] The WSS is a set of **numbered tables**. Identify which table numbers carry
  the target indicators (e.g. Reserve Money, Scheduled Commercial Banks – business
  in India: deposits & bank credit, money supply M3, foreign exchange reserves).
  Record the table number + page for each target indicator.
- [x] Is the PDF **text-extractable** (selectable text → `pdf-parse`/`pdfjs`) or
  **image/scanned** (needs OCR)? This is a hard build fork — confirm explicitly.
- [x] Capture, for ONE release, the literal cell values + labels for the target
  indicators so the parser column mapping can be locked (see Part C).

---

## Part C — Indicator map (what to actually store)

Target series for the wide macro table (one row per `as_on_date`). For each,
record the **exact label as printed**, the **unit**, and the **as-on date** it
refers to (WSS reports "as on <Friday>"):

- [x] **Bank credit** (Scheduled Commercial Banks, India) — *the headline alpha*
- [x] **Aggregate deposits** (SCBs)
- [x] **Currency in circulation**
- [x] **Reserve money**
- [x] **Money supply (M3)** — note: M3 is fortnightly within the WSS, confirm cadence
- [x] **Foreign exchange reserves** (total + components if easy)
- [x] Record the **unit** for each (₹ crore vs ₹ billion vs USD mn — RBI mixes them)
- [x] Record whether each value comes with a **YoY / variation** column or just the
  level (we store the level; note if variations are free to grab)

---

## Part D — Cadence, depth, lineage

- [x] **Release schedule** — confirm the publish day/time (commonly **Friday
  evening IST**). This sets the weekly Railway cron timing + the "no new release
  yet" skip window.
- [x] **Historical depth** — is there a WSS **archive** (past releases listed) or a
  DBIE time series? Record how far back + whether a backfill is feasible (informs
  whether V2-019 gets a backfill script at all).
- [x] **Revisions** — does a new WSS revise prior weeks' figures? If yes, the upsert
  must be `DO UPDATE` (supersede), not `DO NOTHING` — flag which.
- [x] **Redistribution / lineage** — RBI publications are public-sector data; note
  the attribution/ToS for the Product C lineage record (same flag as V2-017).

---

## Issues we might hit — flag during recon

1. **PDF-only with scanned tables** — worst case: forces OCR (build fork, cost). If
   the PDF is image-based, say so loudly — it changes the effort estimate materially.
2. **Dated/rotating URL** — if the weekly file URL embeds a date/id that isn't
   trivially derivable, the collector needs to scrape the listing page for the
   latest link rather than construct the URL. Record which.
3. **Unit inconsistency** — RBI mixes ₹ crore / ₹ billion / USD mn across tables.
   Wrong unit silently poisons the series. Capture the exact printed unit per row.
4. **Mixed cadence inside one publication** — some WSS rows are weekly, some
   fortnightly (e.g. M3, SCB business). Confirm each target's true frequency so the
   table's `as_on_date` semantics are right.
5. **Revisions to prior weeks** — provisional → revised values. Decides upsert mode
   (Part D). Don't assume immutability like V2-018.
6. **Anti-bot on rbi.org.in** — confirm bare `fetch()` works or whether a warm-up /
   headers are needed (Part A3). Best practice: one polite fetch/week, no hammering.
7. **Holiday / no-publish weeks** — RBI occasionally shifts the release. Confirm the
   "not yet published" response so the collector can log + exit 0 (V2-017 Decision 5).

---

## Deliverables back to Claude (to fill the task's Research Appendix)
- The cleanest confirmed source: structured download URL **or** PDF URL + table map
- `scratch/rbi_wss_sample.<csv|xls|pdf>` (one real release)
- The probe script(s) used (throwaway, like the existing `test_*.mjs`)
- A short note: source format (CSV/XLS vs PDF, text vs scanned), URL stability
  (fixed vs dated pattern), access mechanics (bare fetch vs warm-up), the indicator
  label+unit map (Part C), release schedule, archive depth, revision behaviour.

*Once these land, Claude writes the V2-019 task file: schema for a wide
`india_rbi_wss` macro table (one row per `as_on_date`, columns per indicator),
`seed-india-rbi-wss.mjs` weekly collector via `runSeed()`, parser keyed to the
confirmed format, and (if an archive exists) a backfill — mirroring V2-017's
structure with weekly cadence.*
