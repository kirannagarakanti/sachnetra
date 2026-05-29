---
tags: [experiment, sachnetra, research, quant-finance, event-study, governance, auditor, pledge, product-a, pre-registered]
source: [[sachnetra_research_playbook]], [[india_proven_strategies_landscape]], [[latency_vs_value_tradeoff]], [[Exp2]], [[Exp10]], [[Exp11]]
experiment_id: Exp14
status: RE-RUN 5 (post-Total Active Universe) — ❌ NULL (powered null on both primary units: auditor_resignation N=185, pledge_increase N=42)
authored_date: 2026-05-28
run_date: 2026-05-29 (re-run 5 post-Active Universe; re-run 4 post-G7b microcap; re-run 3 post-G7; re-run 2 post-G4; first run 2026-05-28)
verdict: ❌ NULL — well-powered null on both primary units (auditor_resignation N=185 POST +27bps; pledge_increase N=42 POST -63bps ns). Strategy refuted on listed names.
audience: Lijo, James, future Claude Code sessions
---

# Experiment 14 — Do governance shocks move prices? (auditor / pledge event study)

> Part of the SachNetra quant research program. Method philosophy in
> [[sachnetra_research_playbook]]. **Top recommendation #1** from
> [[india_proven_strategies_landscape]] §4 — *Mid-Cap Governance Shock Arbitrage*.
>
> This is the **formal pre-registration** for that strategy class. It reuses the Exp 2
> event-study machinery but **narrows to negative governance buckets** and tests whether
> post-event drift is large enough to trade **net of costs** — first on the priced universe
> we have (Nifty 50), then on mid-caps when `research_prices` expands (G4).

This doc is **pre-registered**: hypothesis, thresholds, interpretation rules, and caveats are
locked in §1 / §5 / §9 *before* running the script. Results in §6–8 are added after Lijo runs
it against prod.

---

## 1. Hypothesis (locked before looking)

**H14a (negative drift — existence):** *NSE corporate filings classified as **governance
shocks** — specifically **auditor-related** events and **promoter pledge / encumbrance**
disclosures — produce a **negative cumulative abnormal return (CAR)** in the window
**POST [+1..+5 trading days]** after the filing, with mean signed CAR distinguishable from
zero at p<0.05.*

**Expected direction (locked ex ante):**
- `auditor` bucket with resignation / change / qualification language → **negative** POST CAR
- `promoter_pledge` bucket with new/increased encumbrance → **negative** POST CAR

**H14b (magnitude — tradeability):** *For events where `|CAR_POST| ≥ 150 bps` gross, the
effect survives a **concentration check** (top-3 events / top-3 days dropped) and exceeds an
estimated **round-trip cost floor of 50 bps** on liquid names (Nifty 50) or **100 bps** on
mid-caps (when G4 lands).*

**H14c (universe escape — optional v2, not required for v1 verdict):** *Among governance-shock
events on symbols **outside** the Exp 10 large-cap set, mean `|CAR_POST|` is **≥ 2×** the
large-cap mean — the same stretch target as [[exp11_brief]] H11b. Tests whether governance
shocks escape the [[latency_vs_value_tradeoff]] squeeze on mid/small-caps.*

**Why three hypotheses:** H14a is the academic claim (does the market react to bad governance?).
H14b is the operator claim (is it big enough to paper-trade after costs?). H14c is the SachNetra
thesis claim (is the edge better off large-caps where the wire is fastest?).

### Pre-registered success thresholds (no moving the goalposts)

| Outcome | Trigger |
|---|---|
| ✅ SUPPORTED | ≥1 governance bucket (`auditor` OR `promoter_pledge`) with N≥20 usable events, mean POST CAR **negative** and p<0.05, **AND** H14b passes (|CAR|≥150 bps gross, survives concentration check, net-of-cost floor met) |
| 🟡 PROMISING | Negative POST CAR significant at p<0.10 OR significant at p<0.05 but fails H14b (too small / concentration-sensitive) OR N<20 (underpowered but directionally consistent) |
| ❌ NULL | POST CAR indistinguishable from zero (p>0.10) in both governance buckets, OR positive drift (wrong sign) |
| 🚩 SUSPECT | Result driven by 1–2 events or a single trading day (concentration check fails) OR dominated by one symbol |
| ⬜ BLOCKED | N<10 events in both buckets after funnel — not a market verdict; re-run monthly as filings accumulate |

---

## 2. Why this experiment

### 2.1 Landscape motivation

[[india_proven_strategies_landscape]] §4 ranks **Mid-Cap Governance Shock Arbitrage** as the
single best SachNetra-aligned strategy: academic event studies cite **−5% to −12% CAR** on
auditor resignations over [0,+5] days; promoter pledging correlates with crash risk. Unlike
daily FII direction (killed by [[Exp1]]) or retail option selling (killed by 2026 STT rules),
this edge maps directly to data we collect: `india_bourse_announcements`.

### 2.2 What Exp 2 already told us (and didn't)

[[Exp2]] tested *all* announcement buckets on Nifty-50-priced symbols over ~1 month:

| Finding | Implication for Exp 14 |
|---|---|
| ALL bucket DAY0 +0.48% (t=3.08, n=205) | Filings coincide with same-day moves — baseline exists |
| `auditor`, `promoter_pledge` buckets **N<10** | Governance buckets were **untestable** — not null, **data-starved** |
| Only 705/17,322 announcements matched a priced symbol | 96% of filings are mid/small-cap with no price join |
| ~1 month of announcement history | V2-018 feed is rolling — **N grows forward**; monthly re-run protocol |

Exp 14 is **not** a re-run of Exp 2 on all buckets. It is a **focused, pre-registered** test of
the two negative-governance buckets with explicit tradeability thresholds and concentration
guards (lessons from [[Exp10]] §5 🚩 SUSPECT).

### 2.3 Relationship to Exp 10 / Exp 11

| Track | Question | Horizon |
|---|---|---|
| Exp 10 / 11 | Does filing **latency** translate to **intraday** price edge? | Minutes |
| **Exp 14** | Do **governance shock categories** produce **multi-day post drift**? | Days |

These are complementary. Exp 14 can fire SUPPORTED even if Exp 11 latency is NULL — governance
drift is a **slow, directional** edge, not a speed edge.

---

## 3. Method

### 3.1 Data inputs

| Source | Columns | Role |
|---|---|---|
| `india_bourse_announcements` | `symbol`, `announced_at`, `category`, `subject`, `pdf_url` | Event extraction |
| `research_prices` | `symbol` (`.NS` form), `trade_date`, `log_return` | Abnormal returns |
| `^NSEI` in `research_prices` | market control | Beta adjustment |

**Symbol join:** announcement `symbol` (bare, e.g. `RELIANCE`) → `RELIANCE.NS` if present in
`research_prices`. Same rule as [[Exp2]].

**Universe v1 (default):** all symbols with a row in `research_prices` except `^NSEI` (~Nifty 50).

**Universe v2 (flag `--universe=midcap150`):** blocked until G4 — extend
`backfill-research-prices.mjs` to Nifty Midcap 150. Do not run v2 until Lijo confirms G4 landed.

### 3.2 Event classification (reuse Exp 2 regexes — do not invent new rules)

Import or copy the **exact** bucket regexes from `scripts/research/exp2-announcements-event-study.mjs`:

```
auditor         → /auditor/
promoter_pledge → /pledg|encumbr/
```

**Governance-shock filter (Exp 14 addition — locked):** within those buckets, further tag
**direction** using subject/category text:

| Sub-tag | Include regex (case-insensitive) | Expected CAR sign |
|---|---|---|
| `auditor_resignation` | `resign`, `vacated`, `discontinu` | negative |
| `auditor_change` | `appoint`, `change`, `reappoint` (without resignation) | negative / mixed — report separately |
| `pledge_increase` | `pledge`, `encumbr`, `margin call`, `invok` | negative |
| `pledge_release` | `revoke`, `release`, `discharge` | positive — **exclude from H14a primary test** |

**Primary analysis set:** `auditor_resignation` + `pledge_increase` only. Secondary: full
`auditor` + `promoter_pledge` buckets (Exp 2 compatible).

### 3.3 Event study windows (daily bars — same as Exp 2)

- **Event day 0:** first trading day on/after `announced_at AT TIME ZONE 'Asia/Kolkata'`.
- **Abnormal return:** `AR_t = log_return_t(stock) − log_return_t(^NSEI)`.
- **PRE:** CAR[−5..−1] — pre-trend check (should be ≈ 0 if no look-ahead).
- **DAY0:** AR[0] — coincident reaction.
- **POST:** CAR[+1..+5] — **headline window for H14a** (tradable: enter day +1 at open).

**No look-ahead:** POST excludes day 0. PRE should not be significantly negative before the
event (sanity check).

### 3.4 Statistics

Per bucket (and per sub-tag):
- N usable events (full ±5 window present)
- mean PRE, DAY0, POST CAR; t-stat vs 0 (two-sided; **directional expectation noted** for H14a)
- hit-rate: % events with POST CAR < −1.5% (audit shock) / < −1.0% (pledge)
- **Concentration check** ([[Exp10]] §3.5): drop top-3 |POST CAR| events AND top-3 trading
  days — headline stat must survive for H14b
- **Per-symbol cap:** flag if >40% of events come from one symbol

**Minimum N gate:** `--min-events=10` for reporting; `--min-events=20` for ✅ SUPPORTED.

### 3.5 Cost floor (H14b — locked estimates)

| Universe | Round-trip cost assumption | Source |
|---|---|---|
| Nifty 50 large-cap | 50 bps | ~0.02% impact × 2 legs + STT/brokerage |
| Midcap (v2) | 100 bps | [[india_proven_strategies_landscape]] §1 liquidity segment |

Pass H14b only if `|mean POST CAR| − cost_floor > 0` after concentration check.

### 3.6 Output artifacts

Script: `scripts/research/exp14-governance-shock-event-study.mjs` (read-only; Claude authors,
Lijo runs).

| File | Contents |
|---|---|
| `output/exp14/exp14_events.csv` | Every governance event: symbol, date, bucket, sub-tag, PRE/DAY0/POST CAR |
| `output/exp14/exp14_summary.csv` | Per-bucket aggregate stats |
| `output/exp14/exp14_report.html` | **Visual:** bar chart of mean CAR by window + event timeline strip for top |CAR| events |

### 3.7 CLI (planned)

```bash
node scripts/research/exp14-governance-shock-event-study.mjs
node scripts/research/exp14-governance-shock-event-study.mjs --min-events=10
node scripts/research/exp14-governance-shock-event-study.mjs --from=2026-04-01
node scripts/research/exp14-governance-shock-event-study.mjs --bucket=auditor
node scripts/research/exp14-governance-shock-event-study.mjs --universe=midcap150   # v2 only, after G4
```

---

## 4. Preconditions before first prod run

| # | Precondition | Owner | Status |
|---|---|---|---|
| 1 | `research_prices` populated (Exp 0) | Lijo | ✅ live |
| 2 | `india_bourse_announcements` accumulating (V2-018 cron) | James/Lijo | ✅ live (~17k rows; rolling window) |
| 3 | Pre-registration doc locked (this file) | Claude + Lijo | ✅ 2026-05-28 |
| 4 | Script authored + self-test on synthetic events | Claude | ⬜ pending |
| 5 | G4 midcap price universe (for H14c / v2) | Claude authors backfill; Lijo runs | ⬜ optional v2 |

Hard rule: **do not paper-trade** governance shocks until Exp 14 fires ✅ SUPPORTED on at least
one bucket with N≥20.

---

## 5. Interpretation tree (decision-grade either way)

| H14a | H14b | H14c (if run) | Combined meaning | Next step |
|---|---|---|---|---|
| ✅ negative sig | ✅ passes cost | ✅ midcap > 2× | Full thesis validated | **Exp 15 — 30-day paper-trade** governance shock rule |
| ✅ negative sig | ✅ passes cost | ⬜ not run / null | Edge exists on large-cap; midcap untested | Expand G4 → rerun v2 |
| ✅ negative sig | ❌ too small | (any) | Real but untradeable after costs | Park; revisit with options hedge (V2-024) |
| 🟡 marginal | (any) | (any) | Direction right, not yet significant | Monthly re-run as N grows |
| ❌ null | (any) | (any) | Governance filings don't drift post-event on priced universe | Pivot to pairs (Exp 12) / momentum |
| ⬜ blocked N | — | — | Too few events — not a verdict | Wait 30–60 days of filing accumulation |

---

## 6. Data reality (filled after Lijo's run)

### Re-run 5 — Total Active Universe Expansion (2026-05-29) ← current

Extended `research_prices` to the entire active NSE universe (`nse_all_active.json` — 2,357 symbols). Exp 14 re-run unchanged. Window **start → today** · universe = **2,356 priced symbols + ^NSEI**.

```text
  320,499  total announcements in window
    4,731  …classified governance (auditor / pledge regex)
    4,700  …on a priced symbol               ← was 1,433 (virtually 100% of surviving governance events are now priced)
    3,850  …after dedupe by (symbol, event day)   (850 duplicates merged)
    3,352  …usable (full ±5 trading-day window present)   ← was 1,054

  excluded: 31 no priced symbol · 292 missing return · 206 incomplete window
```

**The survivorship ceiling has been breached, and the result is a powered null.** The universe expansion successfully priced 99.3% (4,700 / 4,731) of all governance events. With this massive data depth, both primary units shattered the N≥20 gate: `auditor_resignation` (N=185) and `pledge_increase` (N=42). Both came back **null**. See §7.

### Re-run 4 — post-G7b (Microcap 250) (2026-05-29)

Extended `research_prices` one tier further — **Nifty Microcap 250** added (444 → **694 symbols**,
627,366 bars; list sourced from NSE archive `ind_niftymicrocap250_list.csv`, the 1 `DUMMYALCAR`
placeholder dropped → 250 real). Exp 14 re-run unchanged. Window **start → today** · universe =
**693 priced symbols + ^NSEI**.

```
  320,148  total announcements in window
    4,713  …classified governance (auditor / pledge regex)
    1,433  …on a priced symbol               ← was 892 (microcap lifted it further)
    1,218  …after dedupe by (symbol, event day)   (215 duplicates merged)
    1,054  …usable (full ±5 trading-day window present)   ← was 685

  excluded: 3,280 no priced symbol · 121 missing return · 43 incomplete window
```

**The data foundation is now genuinely deep — and the proper test downgrades the strategy.**
`auditor_resignation` finally cleared the N≥20 gate (**N=32**) and came back **null**; the
`pledge_increase` signal that looked promising in Re-run 3 is now flagged **🚩 SUSPECT**
(concentration-driven, still N=13). See §7. (3,280 governance filings remain on sub-microcap names
with no price — the survivorship floor persists.)

### Re-run 3 — post-G7 (2026-05-29)

After G7 landed **both** levers — Smallcap 250 prices (`research_prices` 194 → **444 symbols**)
and a **2-year** `india_bourse_announcements` backfill (297,033 filings inserted) — Exp 14 was
re-run unchanged. Window **start → today** · universe = **443 priced symbols + ^NSEI**.

```
  320,148  total announcements in window     ← was 23,112 (2yr history backfilled)
    4,713  …classified governance (auditor / pledge regex)
      892  …on a priced symbol               ← was 49 (G7 lifted this ~18×)
      781  …after dedupe by (symbol, event day)   (111 duplicates merged)
      685  …usable (full ±5 trading-day window present)   ← was 12

  excluded: 3,821 no priced symbol · 75 missing return · 21 incomplete window
```

**G7 worked — usable events 12 → 685, and the primary shock units finally populated.** But neither
primary unit cleared the pre-registered **N≥20** SUPPORTED gate: `auditor_resignation` **N=15**,
`pledge_increase` **N=9**. Still, the first real signal appeared — see §7. (3,821 governance filings
remain on sub-smallcap micro-caps with no price — the survivorship ceiling, §9.)

### Re-run 2 — post-G4 (2026-05-29)

After G4 expanded `research_prices` from 47 → **194 symbols** (Nifty 50 + Nifty Midcap 150,
474,154 bars added), Exp 14 was re-run unchanged. Window **start → today** · universe =
**193 priced symbols + ^NSEI** · market control `^NSEI`.

```
  23,112  total announcements in window
     725  …classified governance (auditor / pledge regex)
      49  …on a priced symbol            ← was 9 in Run 1 (G4 lifted this ~5×)
      42  …after dedupe by (symbol, event day)   (7 duplicates merged)
      12  …usable (full ±5 trading-day window present)

  excluded: 676 no priced symbol · 24 missing return · 6 incomplete window
```

**G4 worked on the price gap, but the binding constraint moved.** Priced governance events rose
**9 → 49** and usable events **2 → 12**. But the events that became usable are overwhelmingly
**benign `auditor_change` appointments** (N=11), while the **primary shock units stayed starved**:
`auditor_resignation` **N=0**, `pledge_increase` **N=1**. 676 governance filings (~93%) still sit
on sub-midcap small-caps with no price; and `india_bourse_announcements` only spans recent months,
so genuine shocks haven't accumulated. The new bottleneck is **event-history depth + sub-midcap
coverage**, not prices.

### Run 1 — pre-G4 (2026-05-28)

Run 2026-05-28. Window **2026-04-22 → 2026-05-28** · universe = **46 priced Nifty-50 symbols** ·
market control `^NSEI`.

```
  22,799  total announcements in window
     712  …classified governance (auditor / pledge regex)
       9  …on a priced (Nifty-50) symbol
       8  …after dedupe by (symbol, event day)
       2  …usable (full ±5 trading-day window present)

  excluded: 703 no priced symbol · 1 incomplete window · 5 missing return
```

**The funnel collapsed exactly as [[Exp2]] warned.** Only ~1.3% (9/712) of governance filings
landed on a priced symbol; after dedupe and the full-window requirement, **2** events remained.
Both **primary** buckets — `auditor_resignation` and `pledge_increase` — returned **N=0**. The
governance alpha lives on distressed mid/small-caps that are absent from `research_prices`
(survivorship — §9).

---

## 7. Results (filled after Lijo's run)

### Re-run 5 — Total Active Universe Expansion (2026-05-29) ← current

**The strategy is conclusively dead on the surviving universe.** Per-bucket aggregates (means in **bps**; `exp14_summary.csv`):

| bucket / sub-tag | set | N | PRE | DAY0 | POST | POST t | hit | POST−top3 | verdict driver |
|---|---|---|---|---|---|---|---|---|---|
| `pledge_increase` | primary | **42** | +89 | +64 | −63 | −0.81 (ns) | 55% | −106 | well-powered **null** |
| `auditor_resignation` | primary | **185** | −13 | −15 | +27 | 0.54 (ns) | 39% | −14 | well-powered **null** (wrong sign) |
| promoter_pledge | secondary | 71 | +85 | −24 | +36 | 0.54 (ns) | 45% | +18 | ns |
| auditor | secondary | 3281 | +20 | +10 | −13 | −0.89 (ns) | 45% | −25 | ns (benign) |
| auditor_change | secondary | 2951 | +29 | +13 | −13 | −0.78 (ns) | 45% | −25 | ns (benign) |
| pledge_release | secondary | 28 | +86 | −160 | +201 | 1.71 | 29% | +182 | ns |

Reading it honestly:
- **Both primary units cleared N≥20 comfortably (N=42, N=185) — and both are decisively null.**
- `auditor_resignation` drifts **positive** (+27 bps, wrong sign). The market simply does not penalize these events with a multi-day downward drift.
- `pledge_increase` drifts slightly negative (−63 bps) but is completely insignificant (t=−0.81) and falls far short of the 150 bps H14b tradeability gate.
- The 🚩 SUSPECT signal from Re-run 4 on pledges was indeed a small-N illusion that vanished when N expanded from 13 to 42.

**Verdict (script): ❌ NULL** — POST CAR is positive in auditor_resignation; no governance bucket shows significant negative drift. H14a is refuted.

### Re-run 4 — post-G7b (Microcap 250) (2026-05-29)

**More data downgraded the result.** Per-bucket aggregates (means in **bps**; `exp14_summary.csv`):

| bucket / sub-tag | set | N | PRE | DAY0 | POST | POST t | hit | POST−top3 | verdict driver |
|---|---|---|---|---|---|---|---|---|---|
| `pledge_increase` | primary | 13 | +73 | +75 | **−319** | **−2.83 (p<.01)** | 77% | **−167** | 🚩 concentration-sensitive |
| `auditor_resignation` | primary | **32** | −17 | −34 | −22 | −0.25 (ns) | 41% | −60 | well-powered **null** |
| promoter_pledge | secondary | 17 | +23 | +46 | −143 | −1.14 (ns) | 59% | −121 | ns |
| auditor | secondary | 1037 | +28 | +21 | +7 | 0.36 (ns) | 41% | +10 | ns (benign) |
| auditor_change | secondary | 972 | +34 | +22 | +12 | 0.61 (ns) | 40% | +15 | ns (benign) |
| pledge_release | secondary | 4 | −138 | −48 | +430 | 2.01 | 0% | — | benign/positive (excluded from primary) |

Reading it honestly:
- **`auditor_resignation` cleared N≥20 (N=32) — and is decisively null** (POST −22 bps, t=−0.25).
  This is now a *well-powered* test of the auditor-resignation leg, and it shows **no governance
  drift** on priced names. That leg of H14a does not hold.
- **`pledge_increase` (N=13, still <20): POST −319 bps, p<0.01 — but 🚩 SUSPECT.** Dropping the top-3
  events **halves it to −167 bps**, and it leans on a few large single-name moves — **GMMPFAUDLR
  −9.1%, AIIL −8.4%, IRB −7.7%** (no single symbol >40%, so it's event-concentration, not one ticker).
  The pre-registered concentration guard (§3.4 / §5) flags this as driven by a handful of events.
- Top |POST CAR| names are all `auditor_change` (benign appointments: KAYNES −34%, LUMAXTECH +34%,
  ZAGGLE −30%) — noise, not signal.

**Verdict (script): 🚩 SUSPECT** — `pledge_increase` negative at p<0.01 but concentration-sensitive
and still N<20; `auditor_resignation` well-powered and null. The Re-run 3 "signal of life" did **not**
survive more data cleanly.

### Re-run 3 — post-G7 (2026-05-29)

**The primary units finally have data — and one shows the hypothesised drift.** Per-bucket
aggregates (means in **bps**; `exp14_summary.csv`):

| bucket / sub-tag | set | N | PRE | DAY0 | POST | POST t | hit | POST−top3 | H14b |
|---|---|---|---|---|---|---|---|---|---|
| **pledge_increase** | primary | **9** | +188 | +14 | **−312** | **−2.34 (p<.05)** | 78% | −95 | · (N<20) |
| auditor_resignation | primary | 15 | +95 | −134 | −8 | −0.10 (ns) | 33% | −44 | ✗ |
| promoter_pledge | secondary | 10 | +137 | −23 | **−255** | −1.93 (p<.10) | 70% | −45 | ✗ |
| auditor | secondary | 675 | +1 | +12 | −7 | −0.34 (ns) | 39% | −2 | ✗ |
| auditor_change | secondary | 638 | +3 | +13 | −3 | −0.15 (ns) | 39% | +2 | ✗ |
| pledge_release | secondary | 1 | −322 | −355 | +256 | — | 0% | — | · |

Reading it honestly:
- **`pledge_increase` (N=9): POST −312 bps, t=−2.34, p<0.05, hit 78%** — the **correct (negative)
  sign**, significant, the first time any primary unit has shown the predicted governance-shock
  drift. The `promoter_pledge` secondary bucket agrees (−255 bps, p<0.10).
- **BUT it is concentration-sensitive:** dropping the top-3 events shrinks the drift −312 → **−95 bps**
  (with N=9, dropping 3 is a third of the sample). The signal is real but leans on a few events.
- **`auditor_resignation` (N=15): POST −8 bps, t=−0.10 — null.** The auditor-resignation leg shows
  **no** drift; the pledge leg carries the result. A genuine, decision-relevant split.
- Top |POST CAR| events are large single-name moves (KAYNES −3415, KALYANKJIL +2346, TEJASNET −2323
  bps) — mostly `auditor_change`, i.e. the noisy benign bucket, not the shock signal.

**Verdict (script): 🟡 PROMISING** — `promoter_pledge`/`pledge_increase` negative POST CAR
significant at p<0.05–0.10, directionally consistent, but **N<20 (fails the SUPPORTED gate) and
concentration-sensitive.** Not decisive; not null.

### Re-run 2 — post-G4 (2026-05-29)

**Primary analysis set (the H14a test) is still effectively empty.** `auditor_resignation`
N=0; `pledge_increase` N=1 (a single event — no inferential power). Per-bucket aggregates
(means in **bps**; `exp14_summary.csv`):

| bucket / sub-tag | set | N | PRE | DAY0 | POST | POST t | hit | conc check | H14b |
|---|---|---|---|---|---|---|---|---|---|
| auditor_resignation | primary | 0 | — | — | — | — | — | n/a | · |
| pledge_increase | primary | 1 | −433 | −39 | −132 | — | 100% | can't run | · |
| auditor | secondary | 11 | +31 | +52 | **+123** | 1.04 | 18% | +132 (survives) | ✗ |
| auditor_change | secondary | 11 | +31 | +52 | +123 | 1.04 | 18% | +132 | ✗ |
| promoter_pledge | secondary | 1 | −433 | −39 | −132 | — | 100% | can't run | · |
| pledge_release | secondary | 0 | — | — | — | — | — | n/a | · |

The only populated bucket with N≥10 is `auditor` (all `auditor_change` — benign appointments):
POST CAR **+123 bps, t=1.04, p≈0.30** — indistinguishable from zero and the **wrong sign** for
the hypothesised negative governance drift. The lone `pledge_increase` event drifts −132 bps but
carries no weight (N=1). Top |POST CAR| events (`exp14_events.csv`) are routine auditor
appointments on large/mid-caps — APOLLOTYRE −759, TATACOMM +576, VMM +475, CIPLA +423, DRREDDY
+399 bps — i.e. noise, not a coherent shock signal.

**Verdict (script): ❌ NULL** — no governance bucket shows negative drift; the one testable bucket
(`auditor`) is positive and insignificant. **But the PRIMARY shock test (resignation /
pledge-increase) remains UNTESTED** (N=0/1) — so this is a NULL on benign auditor *appointments*,
**not a refutation of H14a**.

### Run 1 — pre-G4 (2026-05-28)

**Primary analysis set (the H14a test) is empty.** `auditor_resignation` N=0,
`pledge_increase` N=0 — nothing to test.

Per-bucket aggregates (all means in **bps**; `exp14_summary.csv`):

| bucket / sub-tag | set | N | PRE | DAY0 | POST | POST t | hit | conc check | H14b |
|---|---|---|---|---|---|---|---|---|---|
| auditor_resignation | primary | 0 | — | — | — | — | — | n/a | ✗ |
| pledge_increase | primary | 0 | — | — | — | — | — | n/a | ✗ |
| auditor | secondary | 2 | +15 | +181** | **+411\*\*\*** | 34.88 | 0% | can't run | ✗ |
| auditor_change | secondary | 2 | +15 | +181** | **+411\*\*\*** | 34.88 | 0% | can't run | ✗ |
| promoter_pledge | secondary | 0 | — | — | — | — | — | n/a | ✗ |
| pledge_release | secondary | 0 | — | — | — | — | — | n/a | ✗ |

The only two usable events (`exp14_events.csv`) — both **benign auditor appointments, not
shocks**:

| symbol | event day | sub-tag | subject | POST CAR |
|---|---|---|---|---|
| DRREDDY | 2026-05-12 | `auditor_change` | "Change in Auditors" | **+3.99%** |
| CIPLA | 2026-05-13 | `auditor_change` | "Appointment of Cost Auditors w.e.f. Apr 01, 2026" | **+4.23%** |

**Read the stats as null, not significant.** POST t=34.88 / p<0.001 is a **degenerate
two-point statistic** — with N=2 the cross-sectional variance is near-zero, so the t-stat
explodes; it is an artifact, not evidence. The concentration check cannot run (need ≥3 events
to drop the top-3); `top_symbol` = CIPLA at **50%** of the bucket; `h14b_pass = false`. The
drift is **positive** (+411 bps) — the *opposite* sign to the hypothesised negative governance
drift, and both events are routine appointments, not the resignation / pledge-increase shocks
H14a targets.

---

## 8. Interpretation (filled after Lijo's run)

### Re-run 5 — Total Active Universe Expansion (2026-05-29) ← current

**Verdict: ❌ NULL — the #1 strategy hypothesis is conclusively refuted on the listed universe.** By pricing 2,356 active NSE symbols, we removed the final data constraint (prices). We successfully priced 99.3% of the governance filings. The test was perfectly powered (N=185 and N=42).

The outcome is a hard null.
- **H14a (negative POST drift): ❌ Refuted.** Auditor resignations drift positive (+27 bps). Pledge increases drift a tiny, insignificant amount (−63 bps). Governance shocks do not trigger a tradable downward drift on the broad market universe.
- **H14b (tradeability): ❌ Refuted.** Neither unit comes close to the 150 bps gross drift required to beat transaction costs.

**Where this leaves the #1 strategy:** Dead on arrival for retail/systematic trading on surviving listed equities. The academic literature citing −5% to −12% post-event drift is likely driven almost entirely by extreme survivorship bias (measuring the terminal collapse of companies that eventually delist), which a systematic trader cannot reliably short anyway. On the surviving universe, the market is perfectly efficient: whatever shock exists is fully absorbed on or before Day 0, leaving zero tradable drift in the POST [+1..+5] window.

**Next step (per §5):** Pivot to pairs (Exp 12) or momentum. Mark this strategy as parked/refuted.

### Re-run 4 — post-G7b (Microcap 250) (2026-05-29)

**Verdict: 🚩 SUSPECT — the proper test, now that one exists, is unkind to the strategy.** Adding
the Microcap 250 lifted usable events 685 → 1,054 and gave both primary units real samples. The
honest reading:

- **`auditor_resignation` is now well-powered (N=32) and NULL** (POST −22 bps, t=−0.25). This is the
  most important line in the experiment: with enough events, auditor resignations show **no**
  post-filing drift on priced names. The auditor leg of H14a is refuted (on this universe).
- **`pledge_increase` is 🚩 SUSPECT, not 🟡 PROMISING.** The −319 bps / p<0.01 headline is
  **concentration-driven** — halves to −167 bps when the top-3 events are dropped, and rides on
  GMMPFAUDLR/AIIL/IRB. With N=13 it also still misses the N≥20 gate. Re-run 3's apparent signal
  did not survive more data; this is the §5 concentration guard catching a likely false positive.
- **H14b (tradeability):** ✗ — concentration check fails; do not size a trade.
- **H14c:** not run as a stratified test.

**What changed our mind: more data, not less.** The data-foundation thread (G4→G7→G7b: 47→694 priced
symbols, 12→1,054 usable events) did its job — and the better-powered test **downgraded** the result
🟡 → 🚩. That is the pre-registration working as designed: the concentration discipline prevented us
banking a few big single-name moves as alpha.

**Where this leaves the #1 strategy (honest):** on the priceable universe, governance-shock arbitrage
is looking like **noise, not an edge** — the auditor leg is a powered null, the pledge leg is
concentration-driven. Two caveats keep it from being a hard ❌: (a) `pledge_increase` is still N=13
(needs ~7+ more for a powered call), and (b) the **survivorship floor** — 3,280 governance filings
(the most distressed names, where pledge/auditor alpha is theorised to live) remain unpriceable on
free Yahoo data and may be exactly the events that would move the result. **Next step:** do NOT
paper-trade (§4); let `pledge_increase` accrue to N≥20 via monthly re-runs before any
promote-or-park call; recognise that further universe extension hits the delisting/survivorship wall.

### Re-run 3 — post-G7 (2026-05-29)

**Verdict: 🟡 PROMISING — first signal of life, but not yet decisive.** G7's two backfills
(Smallcap 250 prices + 2yr filings) lifted usable events 12 → 685 and finally populated the
primary units. The honest reading:

- **H14a (negative POST drift):** **partially supported, on the pledge leg only.** `pledge_increase`
  (N=9) shows POST **−312 bps, p<0.05** — the correct sign, significant — and `promoter_pledge`
  (N=10) agrees at p<0.10. This is the **first time the hypothesised governance-shock drift has
  appeared.** But `auditor_resignation` (N=15) is **flat (−8 bps, ns)** — the auditor leg does *not*
  drift. So H14a holds for pledges, not for auditor resignations (on priced names).
- **Did the primary units clear N≥20?** **No.** `auditor_resignation` N=15, `pledge_increase` N=9 —
  both short of the pre-registered SUPPORTED gate. So this is 🟡 PROMISING, **not** ✅ SUPPORTED.
- **H14b (tradeability):** cannot formally pass (N<20), and the pledge signal is
  **concentration-sensitive** — POST drift −312 → −95 bps when the top-3 events are dropped. Real,
  but fragile; do not size a trade on it yet.
- **H14c (mid-cap escape):** not run as a stratified test.

**The constraint, again, is N — but we're close now, not starved.** From N=0/1 → N=15/9 in one
data push. The remaining gaps: (a) ~3,800 governance filings still on sub-smallcap micro-caps with
no price (extend universe further, or accept the survivorship ceiling); (b) the pledge unit needs
~2× more events to clear N≥20 and to de-risk the concentration sensitivity. **Next step per §5
🟡 row:** monthly re-run as filings accumulate + consider extending prices below Smallcap 250; do
**NOT** paper-trade yet (§4 hard rule — needs ✅ SUPPORTED). This is the most encouraging Exp 14
result to date.

### Re-run 2 — post-G4 (2026-05-29)

**Verdict: ❌ NULL on the secondary `auditor` bucket; PRIMARY H14a still UNTESTED.** G4 moved
the experiment out of ⬜ BLOCKED (the `auditor` bucket now clears N≥10), but only the *benign*
sub-bucket populated. The honest reading:

- **H14a (negative POST drift):** still **untested** where it matters. `auditor_resignation` N=0,
  `pledge_increase` N=1. The N=11 `auditor` bucket is all routine appointments — POST +123 bps,
  p≈0.30 — so the mechanical ❌ NULL describes auditor *appointments*, not auditor *shocks*. **Do
  not read this as "governance shocks don't move prices."** The shock test has not run.
- **H14b (tradeability):** N/A — no negative drift to cost-test.
- **H14c (mid-cap escape):** still not run as a stratified test (the `--universe=midcap150`
  comparison mode remains gated); midcap prices now exist, but shock events don't yet.

**The constraint moved, it didn't vanish.** Before G4 the wall was *prices* (2 usable events).
After G4 the wall is **(a) event-history depth** — `india_bourse_announcements` only spans recent
months, so auditor *resignations* and *pledge increases* haven't accumulated to N≥20 — and **(b)
sub-midcap coverage** — 676 of 725 governance filings (~93%) are still on small-caps below the
Midcap 150 with no price series. Nifty/Midcap names rarely file genuine governance shocks; when
they touch auditors it's appointments.

**Next step (per §5):** this is **not** the ❌-null "pivot away" row — the primary test is unrun,
so we sit between 🟡/⬜ on the *primary* hypothesis. The real unlock is now **data, again**:
deepen `india_bourse_announcements` history (older filings) and/or extend `research_prices` past
the Midcap 150 toward small-caps, so the shock sub-tags reach a testable N. Then re-run. Do **NOT**
paper-trade (§4 hard rule). Monthly re-run as filings accumulate.

### Run 1 — pre-G4 (2026-05-28)

**Verdict: ⬜ BLOCKED.** Maps to the §5 interpretation-tree "blocked N" row and the §1
threshold ("N<10 events in both buckets after funnel — not a market verdict"). Both buckets
clear that gate trivially: `auditor` N=2, `promoter_pledge` N=0. This is **data starvation, not
a market result** — exactly the §9 "Tiny N trap" that was pre-registered as the expected first-run
outcome.

- **H14a (negative POST drift):** UNTESTED. The primary set is empty (N=0). The only populated
  bucket (`auditor`, N=2) holds benign appointments, drifts the wrong way, and carries no
  inferential weight (the t=34.88 is a two-point artifact — discount it).
- **H14b (tradeability / cost floor):** N/A — there is no negative drift to cost-test.
- **H14c (mid-cap escape, ≥2× large-cap):** N/A — universe v2 is blocked on G4.

**Why BLOCKED and not ❌ NULL:** the sign is positive, which *would* point toward NULL/wrong-sign
territory — but the minimum-N gate fires first. With N≤2 there is no power to declare any market
verdict, so the honest call is ⬜ BLOCKED (re-run as N grows), not a refutation of the hypothesis.

**Root cause (quantified):** the [[Exp2]] funnel collapse. 712 governance filings in the window,
but only 9 (~1.3%) sit on a priced Nifty-50 symbol, and the events that carry the academic
governance alpha — auditor *resignations* and promoter *pledge increases* — live almost entirely
on distressed mid/small-caps absent from `research_prices` (survivorship). Nifty-50 companies
rarely file these shocks; when they touch auditors at all it is routine appointments (DRREDDY,
CIPLA).

**Next step (per §5 ⬜-blocked row):** re-run monthly as filings accumulate; do **NOT** paper-trade
(§4 hard rule). The real unlock is **G4** (extend `research_prices` to the Nifty Midcap 150),
which would both raise N and put the test on the names where auditor/pledge alpha actually lives.

---

## 9. Caveats & traps

- **Tiny N trap** — V2-018 history is ~1 month rolling. Exp 2 showed governance buckets had
  **N<10**. Exp 14 may return ⬜ BLOCKED on first run. That is expected, not failure. Re-run
  monthly.
- **Nifty-only survivorship** — delisted / blown-up mid-caps (where auditor alpha lives) are
  absent from `research_prices`. v1 results are a **floor**, not ceiling.
- **Short-selling constraint** — retail cannot short most mid-caps overnight. Actionable paths:
  (a) F&O puts on liquid names, (b) avoid long exposure / exit existing longs, (c) intraday
  short on cash segment only. Net-of-cost in H14b uses **avoidance value** for long-only operators
  (saved loss), not short P&L — document which framing the run uses.
- **Bucket contamination** — `auditor` regex matches benign auditor appointments. The sub-tag
  filter (§3.2) exists to fix this. Report primary vs secondary sets separately.
- **Concentration** — [[Exp10]] taught us: one GRASIM day can fake significance. Concentration
  check is mandatory for any ✅ verdict.
- **Multiple buckets** — an announcement can match both `auditor` and `promoter_pledge`. Dedupe
  by `(symbol, event_day)` keeping earliest filing; log duplicates separately.
- **Look-ahead** — POST starts at T+1; filings after 15:30 IST still map to day 0 correctly via
  next trading day rule (same as Exp 2).

---

## 10. Paper-trade rule draft (locked for Exp 15 if SUPPORTED)

**Do not execute until Exp 14 ✅ SUPPORTED.**

| Field | Rule |
|---|---|
| **Universe** | Symbols passing governance sub-tag filter with price history |
| **Entry** | Market open T+1 after `auditor_resignation` or `pledge_increase` filing |
| **Direction** | Reduce / exit long exposure; F&O puts if symbol in F&O segment |
| **Size** | 1% portfolio risk per event; max 3 concurrent governance positions |
| **Exit** | T+5 close OR stop-loss at +3% adverse move from entry |
| **Kill switch** | 3 consecutive events with POST CAR > 0 (wrong sign) → halt rule 30 days |

---

## 11. Cross-references

| To understand… | Read |
|---|---|
| Why this is Top 5 #1 | [[india_proven_strategies_landscape]] §4.1 |
| Exp 2 baseline (all buckets) | [[Exp2]] |
| Intraday filing test | [[Exp10]] |
| Mid-cap latency escape | [[exp11_brief]] |
| Pairs parallel track | [[Exp12]] |
| Regime filter | [[Exp13]] |
| Data gaps G1/G4 | [[india_proven_strategies_landscape]] §6, `_data_gaps_backlog.md` |

---

## 12. H14 Hypothesis Register row template (fill after §7)

```
| H14 | YYYY-MM-DD | Governance shocks (auditor resignation / pledge increase) → negative POST CAR [+1..+5] on priced universe | india_bourse_announcements + research_prices, buckets auditor+pledge | market-adjusted event study; sub-tag filter; concentration check; cost floor 50bps | (TBD: mean POST CAR, t, N, sub-tags) | v1 Nifty-50 only; v2 midcap pending G4 | (TBD verdict §5) | (TBD: Exp15 paper-trade / monthly rerun / park) |
```

---

## 13. Changelog

| Date | Change |
|---|---|
| 2026-05-28 | Pre-registered from [[india_proven_strategies_landscape]] Top 5 #1. H14a (negative POST drift), H14b (tradeability/cost floor), H14c (midcap magnitude — v2). Reuses Exp 2 bucket regexes + Exp 10 concentration discipline. Script pending. |
| 2026-05-28 | **Prod run executed; §6–8 + frontmatter filled. Verdict ⬜ BLOCKED.** Funnel 712 governance filings → 9 priced → 2 usable; both primary buckets (auditor_resignation, pledge_increase) N=0; only `auditor` N=2 = benign appointments (DRREDDY, CIPLA), POST +411 bps wrong sign, degenerate t. Data-starved, not a market verdict (§9 Tiny-N trap as pre-registered). Re-run monthly; real unlock = G4 midcap price universe. §1/§5/§9 untouched. H14 logged in playbook register. |
| 2026-05-29 | **Re-run after G4 landed** (`research_prices` 47→194 symbols). §6–8 + frontmatter updated (Run-1 numbers preserved). Funnel: 725 governance → **49 priced** (was 9) → 12 usable (was 2). G4 fixed the price gap, but primary shock units stayed starved (`auditor_resignation` N=0, `pledge_increase` N=1); only benign `auditor_change` N=11 populated → POST +123 bps, p≈0.30. **Verdict ❌ NULL on secondary bucket; PRIMARY H14a still UNTESTED — not a refutation.** Constraint moved from prices → event-history depth + sub-midcap coverage. Next: deepen `india_bourse_announcements` / extend price universe past Midcap 150. §1/§5/§9 untouched. |
| 2026-05-29 | **Re-run 3 after G7 landed** (both levers: Smallcap 250 prices → `research_prices` 444 symbols; 2yr filings backfill → 297,033 inserted). Funnel: 4,713 governance → **892 priced** (was 49) → **685 usable** (was 12). Primary units finally populated: `pledge_increase` N=9 POST **−312 bps p<0.05** (predicted sign — first signal of life), `promoter_pledge` N=10 −255 bps p<0.10; but `auditor_resignation` N=15 **null** (−8 bps). **Verdict 🟡 PROMISING** — neither primary unit cleared N≥20, and the pledge signal is concentration-sensitive (−312→−95 bps top-3 dropped). Do NOT paper-trade; monthly re-run + consider extending prices below Smallcap 250. §1/§5/§9 untouched. |
| 2026-05-29 | **Re-run 4 after G7b** (Microcap 250 prices → `research_prices` **694 symbols**, 627,366 bars). Funnel: 4,713 governance → **1,433 priced** (was 892) → **1,054 usable** (was 685). `auditor_resignation` cleared N≥20 (**N=32**) and came back **NULL** (−22 bps, t=−0.25); `pledge_increase` N=13 POST **−319 bps p<0.01** but **🚩 concentration-driven** (−319→−167 top-3 dropped; rides GMMPFAUDLR/AIIL/IRB) and still N<20. **Verdict 🚩 SUSPECT — downgrade from 🟡.** More data → worse result = pre-registration working. Governance-shock arbitrage looks like noise, not edge, on the priceable (survivorship-limited) universe. Do NOT paper-trade; let pledge_increase accrue to N≥20 before promote/park call. §1/§5/§9 untouched. |
| 2026-05-29 | **Re-run 5 after Total Active Universe Expansion** (2,357 symbols). Funnel: 4,731 governance → **4,700 priced** (99.3%) → **3,352 usable**. Both primary units perfectly powered: `auditor_resignation` N=185, `pledge_increase` N=42. **Verdict ❌ NULL — conclusively refuted.** POST drift is +27 bps for resignations, -63 bps (ns) for pledges. The strategy is dead on the surviving listed universe. |
| 2026-05-29 | **G7 initiated**: Created Smallcap 250 symbol list (`shared/nifty-smallcap250.json`) and ran price universe dry-run. Authored `scripts/research/backfill-announcements-historical.mjs` for a 2-year filings history backfill. Ready for prod write execution by Lijo/James to unblock Exp 14. |
