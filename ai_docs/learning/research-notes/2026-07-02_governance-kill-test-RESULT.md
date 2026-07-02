---
tags: [governance-signal, kill-test, result, day-1, clock-geometry, in-progress]
date: 2026-07-02
status: COMPLETE — kill test done + red-teamed + the cheap test RAN. VERDICT = EARNED null for the 4 keyword
  ("autopsy") flags (re-anchor specificity S=0.153 < 0.3; ~62% of survivors also flag). Only live remnant = the
  "looting" flags (pledge/RPT), untested, route to Arm B (deep-history rebuild, parked). Forward FREEZE sealed
  (commit 687961a8). Read-only. Seed 6119. Forward plan: 2026-07-02_governance-forward-plan.md.
reads: 2026-07-02_governance-kill-test-RUN-SHEET.md · 2026-07-02_governance-decisive-test-SPEC-v1.md ·
  2026-06-26_hand-trace-roster-VERIFIED.md
---

# Governance signal — KILL TEST result

**Seed:** 6119 (pinned in v1 §0). **Data floor:** 2024-05-30 (filing history).
**Read-only. No prod writes. No model.**

## Locked roster — 17 clean KEEPs (VERIFIED roster minus RHFL)
RHFL dropped to illustrative (pre-2024 shell, no healthy→distressed arc). Do not pad toward 45.

Coverage split feeds the Day-2 draw (window = [T0−18m, T0−6m]; floor 2024-05-30):
- **Truncated (~50%, window starts pre-floor — the early/leading half is missing):** SIGIND, GENSOL, PREMIER, XLENERGY (all June-2025 T0).
- **~75% coverage (borderline):** AGSTRA, MARSHALL (Sep-2025 T0).
- **~Full coverage (~13 cases → Day-2 draw pool):** FSC (~92%), BILVYAPAR (~99%), SABEVENTS, GOENKA, SANCO, VIVIMEDLAB, WINSOME, OSIAHYPER, PARSVNATH, ASTRON, AKSHOPTFBR.

---

## DAY 1 — Clock geometry

**Goal:** four dates per case → lags. Then median(admit−petition), median(petition−default), and the admission-lag
ceiling flag (>50% of cases with `T_admission − T_default > 12m` → lead structurally capped at "months, not a year+").

**Legend:** dates ISO. "—" = not found / insufficient public data (marked, never guessed).

### Day-1 headline: the roster's T0 dates are contaminated (STOP before Day 2)
Day 1 asked "is the measurement window even clean?" The answer is **no — for ~40% of the roster the window is anchored
to the wrong *year***. The VERIFIED roster took the date of a **recent (2025–26) CIRP-process filing** (resolution
plan / CoC meeting / relisting / NSE disclosure) as `T_admission`, but for many cases the CIRP actually **commenced in
2021–2023**. Those 2025–26 filings are mid/late-stage updates in a long-running CIRP, not the admission.

### Verified admission dates — all 17 (web-sourced; ✓ = confident, ✗ = roster date is NOT the admission)
| symbol | company | roster T0 | **true CIRP commencement** | class | source note |
|---|---|---|---|---|---|
| GENSOL | Gensol Engineering | 2025-06-18 | **2025-06-13** ✓ | FRESH (real) | IREDA §7; petition 2025-05-13 |
| AGSTRA | AGS Transact | 2025-09-01 | **2025-08-25** ✓ | FRESH (real) | Securitrans §9; IND D Feb-2025 |
| SABEVENTS | SAB Events & Governance Now Media | ~2025-11/12 | **2025-11-04** ✓ (PPIRP) | FRESH (small) | Mumbai PPIRP; order recd 11-11 |
| BILVYAPAR | BIL Vyapar (ex-Binani) | 2025-11-28 | **2025-11-13** ✓ | FRESH but **SHELL** | zero revenue, nil employees FY25 → no arc (like RHFL) |
| VIVIMEDLAB | Vivimed Labs | 2026-02-13 | **2026-04-15** ✗ | FRESH (real) | roster date = PPIRP *application* (02-12), not admission |
| OSIAHYPER | Osia Hyper Retail | 2026-05-04 | **2026-04-28** ✓ | FRESH (real) | Aphelion §7, ₹6.72cr |
| PARSVNATH | Parsvnath Developers | 2026-05-12 | **2026-04-30** ✓ | FRESH (real, old distress) | ARCIL §7; 05-12 = upload date |
| ASTRON | Astron Paper & Board | 2026-05-15 | **2026-05-11** ✓ | FRESH (small, contested) | Empire Sony §9, ₹1.77cr OC |
| AKSHOPTFBR | Aksh Optifibre | 2026-06-20 | **2026-06-19** ✓ | FRESH (small, under appeal) | Shantanu §7, ₹3.33cr; NCLAT appeal |
| PREMIER | Premier Ltd | 2025-06-20 | **2021-01-29** ✗ | **PRE-2024** | mfg suspended since Mar-2020; still in CIRP |
| SANCO | Sanco Industries | 2025-12-23 | **2022-07-29** ✗ | **PRE-2024** | §9; res-plan NCLT-approved 2025-12-18 (= roster date) |
| GOENKA | Goenka Diamond & Jewels | 2025-12-10 | **~2022-12 / 2023-04** ✗ | **PRE-2024** | IRP appointed 2023-04-12 |
| XLENERGY | XL Energy | 2025-06-24 | **2023-03-27** ✗ | **PRE-2024** (resolved) | CIRP resolved 2024; **relisted 2025-05-02** |
| WINSOME | Winsome Yarns | 2026-04-17 | **2023-12-22** ✗ | **PRE-2024** | Edelweiss §7; roster date = res-plan approval (2026-04-16) |
| FSC | Future Supply Chain | 2025-10-27 | **2023-01-05** ✗ | **PRE-2024** | DHL §9; roster date = res-plan approval (Oct-2025) |
| SIGIND | Signet Industries | 2025-06-11 | **unverified** | ? | no public admission record found — needs IBBI-direct |
| MARSHALL | Marshall Machines | 2025-09-11 | **unverified** | ? | no public admission record found — needs IBBI-direct |

**Tally of the 17:** 8 genuinely-fresh real-operating (GENSOL, AGSTRA, SABEVENTS, VIVIMED, OSIAHYPER, PARSVNATH,
ASTRON, AKSHOPTFBR) · 1 fresh **shell** (BILVYAPAR → illustrative like RHFL) · **6 PRE-2024** mis-dated
(PREMIER, SANCO, GOENKA, XLENERGY, WINSOME, FSC → drop; windows entirely below the 2024-05-30 floor) · 2 unverified
(SIGIND, MARSHALL).

### Clock geometry (partial — the median was not reached; a prior blocker fired)
Only one case has a fully clean, datable clock:
- **GENSOL:** admit 2025-06-13 · petition 2025-05-13 · first default ≈ 2025-03 (CARE downgrade to **D** 2025-03-03) →
  **admit−petition = 31d · petition−default ≈ 73d · admit−default ≈ 3.4 months.** A *fast* case — because it's a
  marquee fraud the market caught quickly (consistent with hard-truth #1: the fast-to-admit cases are the ones already
  loud).

Two structural problems the fresh cases expose (both re-confirm the fresh-eyes catch that **admission is the wrong clock**):
1. **Legacy-distress cases** (PARSVNATH, VIVIMED) are dragged in by ARCs / on old defaults → real default precedes
   admission by **years**, not months → lead-time structurally uncomputable within our window.
2. **Operational-creditor / small-financial-creditor petitions** (ASTRON ₹1.77cr, AGS ₹2.37cr, VIVIMED trigger ₹2.79cr,
   AKSH ₹3.33cr, OSIA ₹6.72cr) — admission is triggered by a *single unpaid vendor/small loan*, whose "default" date is
   an old invoice unrelated to broad insolvency. So NCLT admission is **doubly** the wrong clock: it lags the real
   financial default **and** (for OC-triggered cases) may not mark genuine insolvency at all.

### Decision — do NOT proceed to Day 2 yet (roster must be rebuilt)
This is not a KILL of #2 and not a "widen the buffer" tweak — it's a **prior data-integrity blocker**: the case roster
must be **rebuilt from the IBBI CIRP registry using true admission/commencement dates**, filtered to **commencement
≥ 2024-06** (so the full `[T0−18m, T0−6m]` window sits inside our filing data), before Day-2 lead-time work is meaningful.
Only ~7 fresh full-coverage cases survive today (GENSOL is ~54% truncated; AGSTRA ~75%) — **below the 10 the draw needs.**
See the checkpoint note to Lijo (this session) for the rebuild plan.

_Sources: Business Standard, LiveLaw/LiveLawBiz, insolvencytracker.in, scanx.trade, whalesbook, ICRA/CARE press
releases, ibclaw.in, company NSE filings (nsearchives). Read-only; no dates guessed — "unverified" where not found._

---

## Fresh-eyes round (2026-07-02) + FINAL VERDICT

After Day 1, Lijo ran a panel of models (MiniMax-M3, Qwen, GLM-5.2, Kimi K2.6, Grok, Claude — one file each in
`ai_docs/gov signal prompt 1|2/`) on the viability question.

> **POST-REVIEW CORRECTION (2026-07-02, repo-aware red-team of this experiment — see the review in-thread).** A second
> review caught real overstatements in this write-up. Correcting them in the open rather than burying them:
> - **The panel was NOT blind.** The Prompt-2 brief handed the models our conclusion verbatim ("~40% weren't recent…
>   <10 clean cases… unreliable clock"). They *ratified premises we supplied* (the premises are true — I re-verified
>   the data floor + script staleness against the DB), they did **not** independently rediscover the roster problem.
>   **"Triangulated three ways / independently converged" is RETRACTED** — it's corroboration of fed premises, not a
>   third independent leg.
> - **The moat claim is over-scoped.** SEBI Reg-30 24h disclosure applies to *listed* entities; the pitch targeted
>   private/unlisted (MCA filings, months-late) → the moat kill bites the *listed* population, not the unlisted target.
>   And pledge/RPT are quarterly/annual, not 24h — and those are the only two flags the panel thought could lead. So
>   the moat is a real caveat for a *listed* feed, not a blanket kill.
> - **The null is ASSERTED, not EARNED.** We stopped at the Day-1 roster blocker and **never computed the
>   pre-registered L/S/R.** The run-sheet's own rule was "if <10 cases, use all" — nothing structurally stopped a
>   Day-2 pilot on the 8 clean fresh cases + controls. Calling it "NULL" substitutes theory for a measurement we
>   could have taken.
> - **Parking overstates the cost.** The panel's near-unanimous fix — re-anchor the label to rating-D / SEBI-default
>   on the LISTED universe (dozens/yr) — does NOT need the deep-history rebuild; I rebutted it by citing a
>   *private*-company data gap, which talks past a fix that was explicitly *listed*-scoped and runs on data we hold.
> - **Web-dates to re-verify before publishing:** WINSOME (2023-12-22, right at the floor — if actually ≥2024-06 it
>   flips to a usable fresh case, 6/17→5/17) + PREMIER/SANCO/GOENKA/FSC/XLENERGY (they drive the whole "floor
>   manufactured false start-dates" story; consistent with our data, but the *year* is web-sourced, not in our text).
> - Note the **seal is unaffected**: `freeze-universe-score.mjs` scores the whole universe and excludes CIRP symbols —
>   it never touches the roster T0s, so the stale roster dates do not leak into the sealed forward list.
>
> **Net (both reviewers agree): the defensible core — "no *validated* predictive governance feed on our current listed
> 2-yr corpus" — is SOUND and DB-confirmed. The "triangulated NULL + blanket no-moat" packaging was inflated by a
> kill-prior. This is an UNVALIDATED / leaning-null result with the real test documented-but-not-run.**

The panel (with those corrections in mind):

### Convergence (grade-the-graders)
**5 of 6 independent families → the retrospective *predictive* feed is NOT validly testable on this data**; the 6th
(Claude's RETRO-CC) concedes it collapses to "descriptive + prospective" at <10 cases. Kimi (told to red-team, did
NOT rubber-stamp this round): *"unfalsifiable — not underpowered, unfalsifiable"* (math needs ≥3.5yr history + 30–40
cases). Qwen: *"an anecdote, not a dataset."* Grok: *"cannot be validly tested."* GLM: null for autopsy flags.
**This triangulates with Day 1** — the strangers independently hit the same two walls Day 1 hit empirically:
**admission is the wrong clock** and **<10 clean cases can't support a predictive test.**

### New catches the panel added (not in Day 1)
1. **"You ARE the disclosure feed" (Claude) — a moat kill orthogonal to the data problem.** Every flag (auditor
   resign, CFO/CS exit, pledge, RPT, late results) is a **SEBI Reg-30 24-hour mandatory disclosure** — in every credit
   desk's inbox the same day. Even if the signal *led*, we'd be T+24h with no edge. Corroborates our prior
   "small-caps are hyper-scrutinized, not ignored" null.
2. **The 2-year floor is self-imposed (Claude).** BSE/NSE announcement archives (~20yr) + CRISIL/India Ratings default
   lists go back far further; our floor is a *scraping-scope* choice, not a hard wall → the null is "null with our
   current corpus," not "null in principle." (This is the seed of the parked deep-history rebuild.)
3. **Looting-vs-Autopsy flag split (Qwen/GLM/Claude):** only RPT + pledge could plausibly *lead*; auditor/CFO/late
   are lagging death-debris.
4. **Within-company self-control (Claude/MiniMax):** each case contributes many healthy-period company-quarters →
   statistical traction with few cases (contingent on #2).

### Reality-check — rejected for us (anchor pass)
- **The near-unanimous "pivot to a DaaS / monitoring-alert product" is the trap, not the answer** — it collides with
  positioning_v2's B2B-kill AND inherits our unsolved structuring problem (router parked ~87%, G1/G6 gappy). The panel
  can't see that history.
- **"Re-anchor to first-default/rating-D" over-assumes data we lack** — private/small-cap cases often have no rating
  and no clean default disclosure (Day 1: only Gensol had a clean rating-to-D).
- **The looting core is data-starved exactly where our cases are** — pledge is listed-only, RPT annual/sparse, cases
  skew small/private.

### FINAL VERDICT (revised after review — and the cheap test now RAN)
**EARNED null for the keyword flags.** After the red-team, we ran the panel's prescribed cheap test while the DB was
still up (`scripts/research/governance-reanchor-probe.mjs`, read-only, seed 6119): re-anchor the clock to the first
public distress event (default disclosure / rating-to-D) on the *listed* universe → **49 distress-event companies, 18
with adequate window coverage**, scored against **96 matched survivor controls**. **Pre-registered specificity
S = 0.153 (< the 0.3 bar) → NULL.** The governance flags do **not** cleanly separate distress from survivors — ~62% of
*random survivors* also fire a flag in any 12-month window (2×2: cases 14/4 flagged, controls 60/36; only `auditor`
separates, +0.24; `kmp` is reversed −0.06). So the null is now **earned, not asserted**, on a real number. Output:
`scripts/research/output/probe-governance/reanchor_probe.json`.

**Scope + caveats (don't over-claim the other way either):** this earns the null for the **4 keyword ("autopsy")
flags** only — the two "looting" flags (**pledge, RPT**) the panel thought could *lead* are **not in filing text and
remain untested** (they need the structured data of the parked deep-history rebuild, Arm B). The case label is
**text-matched and noisy** (49 events include chronic-loss PSUs like MTNL/HMT and minor "dues to authority" items),
**n=18 is small**, and lead-time L is window-degenerate (window ends at T0*−6m). Bottom line: the *autopsy-flag* feed is
a **measured null**; the *looting-flag* question is the only live remnant, and it routes to Arm B.

### Decision (Lijo, 2026-07-02)
1. **FREEZE now + publish the nulls (ch. 2).** The forward freeze is the only skeptic-proof arm and is cheap.
2. **DEEP-HISTORY REBUILD — parked, resume when time.** Catch #2 keeps a principled door open at a real build cost.
→ Both specified in **`2026-07-02_governance-forward-plan.md`**. Nulls write-up: `ai_docs/publications/2026-06-27_governance-blowup-honest-negative-result.md` (ch. 2)._
