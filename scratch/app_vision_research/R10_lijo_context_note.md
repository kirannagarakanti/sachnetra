# R10 — Plain-English context for Lijo (2026-05-27)

*Answers you gave + terms you asked about. Antigravity should read this.*

---

## What you told us

| Topic | Your answer |
|---|---|
| Money goal | **A)** Make money **using** SachNetra (you picked trading path) |
| Target | **₹50,000/month** counts as "working" |
| Timeline | **30 days** to first money |
| Trading experience | **Never traded** — you **build** products |
| Instruments | **Don't know** yet (cash / F&O / MF) |
| Cut to go fast | **Skip** Hindi UI, mobile app, perfect UI for now |
| Broker / tips | Asked what rules mean — **default: keep no broker, no tips** |
| SEBI RA | **Not registered** |

---

## Paid pilot vs product-first (you asked)

### Product-first

Build more features → polish site → *then* try to find a customer.  
**Risk for you:** 30 days pass with ₹0 while you keep building.

### Paid pilot (B2B)

**One** company (fintech, quant shop, media, research firm) pays a **small trial fee** (e.g. ₹10k–50k/month) to access your **data** — CSV export, API, or daily filing/sentiment feed — for **30–90 days**.

- You do **not** need a perfect app UI.
- You **do** need: sample data, clear scope, simple contract/invoice, **no buy/sell advice**.
- Often needs **cold email / LinkedIn** ("we have 17k NSE announcements + tagged news in PostgreSQL — want a 2-week sample?").

**For a builder with no trading history, paid pilot is usually faster to ₹50k than learning to trade in 30 days.**

**Lijo 2026-05-27:** Sales calls / cold outreach = **OK**.

**Data honesty for pilots:** We **cannot** reliably offer a fixed “last 30 days” productized dump — collectors and schema **keep changing**. Pitch instead:

- **Beta data partner** — forward feed from date X, schema version documented
- **Point-in-time sample** — “here is what we have as of today” (row counts, date range in README)
- **Specific slice** — e.g. NSE filings backfill (V2-018) + last N days of `india_news_signals` with caveats

Agent must list this as **P0 gap** (data productization / export stability) and **not** recommend pilots that require frozen 30-day history without engineering work.

Agent must compare both paths in `R10_fastest_revenue_paths.md`.

---

## SEBI / rules (simple)

You are **not** a SEBI-registered Research Analyst (RA) if you said no.

| OK without RA (generally) | Risky / needs registration or lawyer |
|---|---|
| News aggregation + links to filings | "Buy HDFC" / "Sell Infy" on WhatsApp or app |
| Showing **public** FII/DII numbers | Personalized portfolio advice |
| Selling **data feed** to a company (B2B) | Acting like a stock tip channel |
| Your own **personal** investing (once you start) | Publishing trade calls to the public |
| Not holding client money (not a broker) | Becoming a broker without license |

**Keep locked:** no broker (no orders in SachNetra), no public tips channel.

**Data business:** B2B "here is a CSV of tagged headlines + sentiment" is a **different** lane than "subscribe for stock picks" — still get basic compliance review before first invoice.

---

## Honest tension (agent must address)

You chose **A) trading P&L** but have **never traded**. ₹50k in **30 days** from trading alone is **not realistic** for a beginner.

Research should rank:

1. **SachNetra revenue** (pilot, Pro, newsletter) — can a builder hit ₹50k in 30 days? (hard but possible with one pilot)
2. **Learning + paper trading** — product helps *you* start investing safely over months
3. Do **not** pretend the app is already your trading edge

Executive summary must recommend **one primary 30-day path** with evidence.
