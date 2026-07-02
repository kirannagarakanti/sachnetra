---
tags: [pre-registration, governance-signal, blow-up, kill-test, hand-trace, locked, structural-intelligence]
date: 2026-06-26
status: ⚠️ LOCKED PRE-REGISTRATION — committed BEFORE any data was inspected. Do NOT edit the formula, labels,
  matching rule, metric, or kill criteria after touching data. Amendments require a dated CHANGELOG entry with a
  reason, made BEFORE seeing the affected result. This file is the honesty contract that distinguishes this from
  the 18 nulls' post-hoc rationalization and the router's self-grading.
related: 2026-06-26_fresh-eyes-design-round.md, 2026-06-26_governance-blowup-signal-design.md,
  scripts/research/exp14-governance-shock-event-study.mjs, [[project-pivot-governance-door]]
---

# PRE-REGISTRATION — Governance Blow-Up Early-Warning, 2-Week Hand-Trace Kill Test

## Claim under test
A per-company **Governance Friction Score** built from regulatory filings flags names heading for a **Tier-1
distress event** (default / insolvency / forced delisting) materially **before** the rating agency or the price
moves — enough lead time that a credit / risk desk would pay for it as a "do-not-touch" triage flag.

## Why a hand-trace first (not a backtest)
Fresh-eyes round 3 (10 models, unanimous): with ~2yr clean filings + no paid PiT universe, a universe-wide backtest
is underpowered and overfit-prone. The honest first gate is a **matched case-control hand-trace** — cheap, manual,
falsifiable in 2 weeks, and immune to most infra bias. If it can't show separation on hand-picked cases, no
infrastructure will rescue it. If it passes, it is ALSO the first marketing artifact.

---

## 1. LABEL — what counts as a "blow-up" (Tier-1, regulatory record only; survivorship-robust)
A company is a **CASE** if it experienced the FIRST of any Tier-1 event, dated at its **exchange disclosure date**:
- **NCLT/IBC admission** under §7/§9, **not withdrawn within 90 days**.
- **SEBI 24-hour default disclosure** (Reg 30 — default on loan/interest to banks/FIs). *[gold label; free; since 2019]*
- **Credit rating action to "D" / Default** by any SEBI-registered CRA.
- **Compulsory/forced delisting or penal suspension** (NSE/BSE), **excluding** voluntary delisting and M&A/scheme
  exits.
- **Liquidation order.**

**Explicitly NOT labels (pre-committed):** price drawdown of any size (re-opens survivorship); ASM/GSM surveillance
entry (reactive to price/volume → circular, lagging); voluntary delisting / merger.

**Event date `T0` = the NCLT/IBC ADMISSION date** (Probe 3, both recons: the legally-precise, available "moment the
company effectively died"). **Never use the delisting date** — a stock often trades on in the "Z" group for months/
years after admission, so delisting is far too late (the signal would be ancient by then). **Lead time is reported
CONSERVATIVELY:** if a hard public distress flag (SEBI default disclosure / trading suspension) *preceded* admission,
also measure lead-time against that earlier date and headline the *smaller* lead — and exclude any friction feature
that postdates the earliest hard flag (so we never claim credit for merely reacting to the first crash). The 6-month
min-gap is measured from the earliest of {hard distress flag, admission}.

**Insolvency CASE source = IBBI CIRP registry (Probe 3), NOT announcement text.** Download the IBBI quarterly
newsletter CIRP Excel; keep **`CIN LIKE 'L%'`** (the structural listed-company filter); **drop only <90-day Sec-12A
withdrawals**; **keep Ongoing + Resolution Approved + Liquidation** (all are equity wipeouts — "Resolution" means the
company was bought out of bankruptcy and original shareholders went to zero). Bridge CIN→ISIN (BSE master) → join to
our `india_bourse_announcements.isin`.

## 2. UNIVERSE / matching (survivorship-free by construction)
- **Cases:** drawn by RULE, not cherry-pick — see §6 (Probe-1 surfaces all Tier-1 events in the window; the famous
  deep-history set is a separate caveated illustrative arm).
- **Controls:** for each case, **1 matched survivor** — same NSE macro-sector, nearest market-cap bracket **as of
  T0−18m**, that did NOT have any Tier-1 event within [T0−18m, T0+6m]. Drawn from a bhavcopy-derived point-in-time
  listed set (Probe 2 — **CONFIRMED feasible & free; dead names survive in archives, DHFL verified in 2021-06-10
  bhavcopy**), NOT from the current price feed. *For the manual hand-trace, controls are hand-picked per the rule; the
  automated bhavcopy-derived universe is a fast-follow for the full build, NOT a pre-req for the hand-trace.*
- Matching is 1:1 for the hand-trace (expand to 1:3 only if the full backtest is later built).

## 3. FRICTION SCORE — frozen formula (NO tuning on outcomes, ever)
Computed from filings observable **on/before the scoring date**, timestamped by **exchange disclosure date** (never
period-end, never the date printed on the PDF; original first-filed version only).

**Feature set (the only features; frozen):** within the trailing 12-month window ending at the scoring date —
| # | Flag | Fires when |
|---|------|-----------|
| F1 | Auditor resignation | statutory auditor resigns (esp. citing "lack of information"/qualification) |
| F2 | Promoter pledge elevated/rising | promoter pledge **% LEVEL** (from the latest quarterly shareholding pattern as of the scoring date) is >50% of promoter holding, **OR** rose >10pp over the trailing 2 quarters. *(NOT from announcement text — see Probe-1b: pledge specifics live in SAST PDFs / shareholding-pattern, not the subject field. Hand-collected per roster name for the hand-trace; automated via the V2-015 pledge-% feed for the full build.)* |
| F3 | Sudden CFO/CS exit | CFO or Company Secretary resigns, no successor named within 60 days |
| F4 | Independent-director exit | independent director resigns citing "personal reasons"/concerns, tenure <2yr |
| F5 | RPT spike | related-party-transaction value >15% of revenue (annual-report filing date) |
| F6 | Delayed results | quarterly/annual results filed late vs the statutory deadline |

**PRIMARY score = simple count of distinct flags present (0–6)** — least gameable; this is the headline.
**SECONDARY score = severity-weighted** (F1=3, F2=3, F3=2, F4=2, F5=2, F6=1) — sensitivity check only.

**Circularity guards (pre-committed):**
- **Credit-rating downgrades are HELD OUT of the friction score** (they appear in the label and are the benchmark we
  claim to beat — including them as a feature would be circular). Reported separately as the benchmark, never scored.
- **Min-gap:** a flag only counts if it fires **≥6 months before T0**. Anything in [T0−6m, T0] is excluded (it's the
  blow-up itself, not a prediction of it).
- **Inevitability exclusion:** if a name already has ≥2 flags before T0−18m it is flagged "already-distressed" and
  reported separately (we are not claiming to predict the already-terminal).

## 4. SCORING POINTS & METRIC
- Compute the friction score at **T0−18m** and **T0−12m** for every case and control.
- **PRIMARY metric — pairwise separation:** in what fraction of matched (case, control) pairs is the case's PRIMARY
  score at **T0−12m strictly greater** than its control's?
- **SECONDARY metric — lead time:** for cases the score flags (score ≥2 at T0−12m), median months between the first
  threshold-cross and (a) T0 and (b) the first rating-agency downgrade. *(This is the number a desk pays for.)*

## 5. KILL CRITERIA (locked — no moving the goalposts)
Evaluated in this order; failing the PRIMARY kills the timing claim.
1. **PRIMARY (separation):** PASS requires case-score > control-score at T0−12m in **≥ 65%** of matched pairs.
   < 55% → ❌ KILL (signal is noise). 55–65% → 🟡 INCONCLUSIVE (underpowered; do not over-claim).
2. **Lead time:** PASS requires **median lead-time ≥ 6 months** before T0 among flagged cases. < 3 months → the
   "early-warning" claim dies even if separation holds (it's a coincident/nowcast signal, not predictive).
3. **Shuffle (Sarvam):** randomly shift every flag's date by ±6 months, recompute; real separation must exceed the
   **95th percentile** of 1,000 shuffles. Fail → the timing is indistinguishable from noise → KILL.
4. **Dumb-benchmark:** PRIMARY score must beat **"promoter pledge level ≥50% alone"** on pairwise separation. If
   pledge-level-alone ties/wins, the multi-factor score is over-engineered → demote to the single factor.
5. **Nowcast (Kimi):** of the current top-decile scorers in live data, **< 70%** may be already-obvious distressed
   names. ≥70% obvious → it's a nowcast, not early-warning → unsellable as a forward flag.
6. **Base-rate / power:** if Probe-1 finds **< 20** Tier-1 events in the clean window, the primary arm is
   **underpowered → report as INCONCLUSIVE**, lean on the illustrative deep-history arm, and do not claim validation.

**Disposition if KILLED:** mirror Exp21/V2-015 — the governance dataset remains a *dataset-of-record* (still worth
collecting), but the *predictive-timing product* claim is closed. No experiment #19 reruns.

## 6. ROSTER
**PRIMARY arm (clean window, low-bias):** ALL Tier-1 events surfaced by Probe 1 in **[2023-07-01 → 2025-06-30]**
(scoring window allows ≥18m lookback into our ~2024+ filings + an 18m forward outcome), each matched 1:1 per §2. The
roster is defined by the §1 RULE applied to Probe-1 output — names are NOT chosen by hand here.

**Illustrative deep-history arm (caveated, NOT headline — asymmetric-digging risk acknowledged):** a fixed,
pre-committed set, hand-traced from public filings:
- Recent clean-window (Gemini roster): **Supreme Engineering, Aksh Optifibre, Varanium Cloud, Cantabil Retail.**
- Famous: **DHFL, Yes Bank, Reliance Capital, Cox & Kings, Vakrangee, Manpasand Beverages, PC Jeweller, CG Power,
  Zee, Sintex, Future Retail, Srei, Reliance Communications.**
Each paired with one matched survivor (same sector/size at T0−18m). Reported as illustration + the marketing
hand-trace, explicitly lower-confidence.

## 7. ATTACK ROUND (after results — Lijo's directive)
Feed the hand-trace + probe results back to the same 10-model crew: show them our locked pre-registration and the
actual numbers, and ask them to **red-team the result** — what artifact could still be faking the separation, is the
lead-time honest, would a real risk desk buy it. Their critique → Claude anchor reality-check → go/no-go on the full
build. (This is the protocol's attack round; the pre-registration above is what makes the challenge meaningful —
they critique a locked design, not a moving target.)

## CHANGELOG
| Date | Change | Made before seeing affected result? |
|------|--------|--------------------------------------|
| 2026-06-26 | Initial lock. | n/a (no data touched) |
| 2026-06-26 | **Probe-1 feasibility amendments (metadata only — NO friction-vs-blow-up result seen).** (a) Filings start 2024-05-30, so the PRIMARY arm = Tier-1 events with **T0 ≈ 2025-09 → 2026-06** (gives a fully-in-data trailing-12m window at the T0−12m scoring point). **Scoring points = T0−6m and T0−12m** (both fully covered); T0−18m kept only as a truncation-caveated secondary read. Deep famous names (pre-2024) stay illustrative-only. (b) **Feature-availability note:** F1 auditor, F3 CFO/KMP, F4 director-exit are well-captured; **F2 pledge and F5 RPT are under-captured** in announcement text. | Yes — driven by Probe-1 counts/dates, not by any separation result |
| 2026-06-26 | **PRIMARY case source switched to our OWN filings (authoritative, in-lane) — NOT the web-reconstructed IBBI list.** The Antigravity agent could not fetch the JS-rendered IBBI Excel; it web-search-reconstructed an 18-row list that is incomplete (famous large-caps only; missed the small-cap CIRP population), partly contested (Supreme `L99999` placeholder CIN, Manpasand/BGR under NCLAT stay, conflicting CINs), and has no per-row citations (all generic `ibbi.gov.in/`) → NOT sound to anchor the pre-reg test; demoted to a cross-check + the famous pre-2024 illustrative arm. **The clean source = our own `india_bourse_announcements` native category "Corporate Insolvency Resolution Process"** (the company's OWN exchange disclosure of its CIRP): 89 companies total, **27 PRIMARY candidates** (first CIRP filing ≥2025-06 → ~12m lookback) — clears the ≥20 base-rate gate, correctly exchange-dated, complete (incl. small-caps: GENSOL, RHFL, SKIL, Setubandhan, SabEvents, Goenka, Vivimed, Parsvnath, Educomp, Talwalkars, Winsome, AGS Transact, JP Power…). `scripts/research/probe-cirp-self-disclosed.mjs` → `output/probe-governance/cirp_self_disclosed.csv`. HAND-VERIFY each is the company's own admission (not a subsidiary/3rd-party mention or a stayed/withdrawn case). | Yes — driven by source feasibility + candidate inspection, NOT by any separation result |
| 2026-06-26 | **Roster-assembly finding: announcement TEXT is too noisy for the LABEL — source insolvency from IBBI.** Pulling Tier-1 events by text-matching `india_bourse_announcements` returned 99–127 "candidates" but heavily polluted: healthy names (Coforge, ITC, Vedanta, Ashok Leyland, Narayana, Aster DM, Kansai Nerolac) trip "insolvency" because they're a CREDITOR / acquirer-of-stressed-assets / litigant in someone ELSE's CIRP, and "default disclosure" catches NIL quarterly certs + subsidiary/borrower defaults. Text can't separate "THIS co entered CIRP" from "co mentioned NCLT." **→ The clean CASE label must come from the authoritative IBBI CIRP registry (corporate-debtor + CIN + admission date + Withdrawn/Liquidated status), per Probe 2 — NOT announcement text.** Default cases = the actual non-NIL, non-counterparty Reg-30 disclosures (verify individually). Same structural lesson as pledge (Probe-1b): the clean label lives in the structured registry, not the subject line. Roster script `assemble-blowup-roster.mjs` is a *prefilter/starting list*, not the final roster. | Yes — driven by candidate-list inspection, NOT by any friction-vs-outcome separation result |
| 2026-06-26 | **Probe-1b: F2 redefined (feasibility, pre-results, and an IMPROVEMENT).** Probe-1b confirmed pledge specifics are NOT in announcement text — 9,167 SAST/Reg-31 rows carry a generic subject ("Disclosure under SEBI Takeover Regulations"); the actual pledge content is in the attached PDF. Text extraction of F2 is a dead end. **F2 now = promoter pledge % LEVEL/TREND from the quarterly shareholding pattern** (structured; >50% level or >10pp rise) — which is *better* than event-text (it's exactly the pledge-trend input claude.ai's original kill-gate wanted) and makes the dumb-benchmark (pledge ≥50%) computable. For the hand-trace: **hand-collect pledge % per roster name from NSE shareholding-pattern** (manual, fits the manual design). For the full build: the automated pledge-% feed = **V2-015** (the governance door now materially DEPENDS on V2-015's pledge collector). F5 RPT similarly lives in filings/PDFs not subject text — keep as low-confidence, hand-collect for the roster. | Yes — driven by Probe-1b structure, not by any separation result |
