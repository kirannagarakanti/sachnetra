# Gemini recon brief — NSE corporate-announcements 403 (for SachNetra V2-018d)

**Date:** 2026-06-09
**Why:** Our Railway cron `seed-india-announcements` has fetched 0 rows since 2026-05-30.
Deploy logs show `NSE warm-up HTTP 403` on the FIRST request (`GET https://www.nseindia.com/`).
A sibling collector (bulk/block **Deals**) hits the SAME NSE host from the SAME Railway IP with a
**two-hop** warm-up and is still fresh (2026-06-08). We plan to copy the two-hop warm-up. We need you
to confirm/refute that plan with live, current (2026) evidence before we ship.

**Our current (broken) warm-up:** single `GET https://www.nseindia.com/` → take Set-Cookie → call
`https://www.nseindia.com/api/corporate-announcements?index=equities&from_date=DD-MM-YYYY&to_date=…`
with `User-Agent: <Chrome 120>`, `Accept: application/json…`, `Referer: …/corporate-filings-announcements`, `Cookie:`.

**Our planned fix (two-hop, copying Deals):** hop1 `GET /` → hop2 `GET /companies-listing/corporate-filings-announcements` (with hop1 cookies + `Referer: /`) → merge cookies (expect `bm_sz` + `bm_sv`) → then call the API.

---

## Questions (answer each with a citation + date)

1. **Minimal working handshake (2026).** What is the current minimal request sequence to read
   `nseindia.com/api/corporate-announcements?index=equities` (or the corporate-filings announcements
   endpoint) WITHOUT a 403? List the exact cookies required (e.g. `nsit`, `nseappid`, `bm_sz`,
   `bm_sv`, `ak_bmsc`, `_abck`) and which page-load sets each.

2. **Is two-hop enough?** Does loading the homepage + one content page reliably yield the cookie set
   the API now needs, or is a third step / a specific endpoint warm-up required? Did anything change
   around **April–June 2026** (Akamai tightening) that broke single-hop scrapers?

3. **Datacenter/cloud IP block (the decisive question).** Does NSE/Akamai hard-block AWS / cloud /
   datacenter egress IPs for these endpoints regardless of headers? If yes, is a **residential/India
   proxy** mandatory? (Note: our Deals collector currently SUCCEEDS from a Railway datacenter IP, which
   suggests NOT a hard block — please confirm or explain the discrepancy.)

4. **Headers.** Beyond `User-Agent`, which headers does NSE now require/expect (e.g. `Accept-Language`,
   `Accept-Encoding`, `sec-ch-ua`, `sec-ch-ua-platform`, `sec-fetch-site/mode/dest`,
   `Upgrade-Insecure-Requests`, `Connection`)? Give the exact header set of a working request, and a
   current realistic Chrome UA string (our pinned one is Chrome/120 — is that now flagged as stale?).

5. **Community evidence.** Check the maintained NSE-access libraries and recent issues (2025–2026):
   `jugaad-data`, `nsepython`, `nse` (npm), and GitHub issue trackers. What handshake are they using
   NOW for announcements/corporate-filings, and have they logged a mid-2026 403 wave + fix?

6. **Rate/cadence.** Any evidence that polling these endpoints hourly (vs once daily) triggers
   IP/behavioral blocking? Recommended safe polling cadence?

---

## Deliverable (write to `scratch/V2-018d_nse_recon_findings.md`)

- A **verdict**: does our two-hop plan fix it, or do we need extra headers / a proxy?
- The **exact** recommended header set + cookie sequence (copy-pasteable).
- Whether to bump the Chrome UA, and to what.
- Citations with dates. Flag anything you could only verify by live-probing vs. documentation.

**Hard rules:** read-only recon only; do NOT touch our prod DB or any `scripts/*` files; findings go in
`scratch/` for Claude to synthesize into the V2-018d task. No fabricated citations — if unknown, say so.
