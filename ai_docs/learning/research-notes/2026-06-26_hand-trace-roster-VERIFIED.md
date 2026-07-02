---
tags: [hand-trace, roster, verified, governance-signal, cirp, cases, blow-up]
date: 2026-06-26
status: VERIFIED case roster — the 27 primary CIRP candidates hand-classified from their actual exchange filings
  (read from cirp_verify_dump.txt). KEEP = genuine fresh listed blow-up with a datable T0 + lookback. This is the
  primary-arm case list for the hand-trace.
related: 2026-06-26_governance-blowup-PREREGISTRATION.md, scripts/research/probe-cirp-verify.mjs,
  scripts/research/output/probe-governance/cirp_verify_dump.txt, [[project-pivot-governance-door]]
---

# Hand-Trace Roster — VERIFIED (primary arm)

Verification rule: read each company's own "Corporate Insolvency Resolution Process" filings; classify as **KEEP**
(genuine fresh admission of THIS listed company, with a clear admission date `T0`), **FLAG** (genuine but messy
date / old-ongoing / entity ambiguity / too-recent), or **DROP** (not a real blow-up: stayed/set-aside, application-
only, or withdrawn). T0 = the admission/commencement date from the filing (the Event-Zero per pre-reg §1).

## KEEP — genuine listed blow-ups (the primary case list)
| Symbol | Company | T0 (admission) | Note |
|---|---|---|---|
| GENSOL | Gensol Engineering | 2025-06-18 | marquee 2025 governance/fraud collapse |
| SIGIND | Signet Industries | 2025-06-11 | single filing — confirm exact order date |
| PREMIER | Premier Ltd | 2025-06-20 | |
| XLENERGY | XL Energy | 2025-06-24 | resolution plan features filed 1 wk later (fast) |
| AGSTRA | AGS Transact Technologies | 2025-09-01 | well-documented, 25 CoC filings |
| MARSHALL | Marshall Machines | 2025-09-11 | clear admission + CoC trail |
| ~~RHFL~~ | ~~Reliance Home Finance~~ | — | **DROPPED to illustrative (hand-trace 2026-06-26): a pre-2024 shell — promoter holding already 0.74%, no pledge possible, no healthy→distressed arc in our window. Real collapse was 2019–21; the 2025 CIRP is the formal burial. Not a fair early-warning test.** |
| FSC | Future Supply Chain Solutions | 2025-10-27 | fast → resolution plan Dec 2025; lookback ~13m (ok) |
| BILVYAPAR | BIL Vyapar | 2025-11-28 | Form-A + CoC trail |
| GOENKA | Goenka Diamond & Jewels | 2025-12-10 | |
| SANCO | Sanco Industries | 2025-12-23 | single filing — confirm |
| VIVIMEDLAB | Vivimed Labs | 2026-02-13 | |
| WINSOME | Winsome Yarns | 2026-04-17 | |
| OSIAHYPER | Osia Hyper Retail | 2026-05-04 | clear NCLT initiation + IRP |
| PARSVNATH | Parsvnath Developers | 2026-05-12 | clear CIRP + IRP; an NCLAT order exists — confirm CoC proceeded (it did) |
| ASTRON | Astron Paper & Board Mill | 2026-05-15 | Sec-9(5) operational-creditor admission |
| AKSHOPTFBR | Aksh Optifibre | 2026-06-20 | clear NCLT order; very recent (short post-window) |
| SABEVENTS | Sab Events & Governance Now Media | ~2025-11/12 | **PPIRP** (pre-packaged) variant — still a blow-up; confirm commencement date |

→ **18 clean KEEPs** — at/above the ≥20 base-rate gate once 2–3 resolved FLAGs are added. Spread across marquee
(Gensol, RHFL, Future Supply Chain, Parsvnath) and small/micro-caps — the population the web-reconstructed list missed.

## FLAG — genuine but resolve before including
| Symbol | Company | Issue |
|---|---|---|
| SKIL | SKIL Infrastructure | admitted earlier, NCLAT-stayed, CoC only constituted Oct 2025 → T0 ambiguous |
| SETUINFRA | Setubandhan Infrastructure | filings are compliance-failures; admission date imprecise (RP meeting Dec 2025) |
| EDUCOMP | Educomp Solutions | OLD/ongoing insolvency (predates our 2024-05 data); 2026 step is a continuation, not a fresh blow-up → illustrative only |
| DPSCLTD | DPSC Ltd | entity ambiguity (DPSC vs India Power Corp / IPCL); confirm which is the corporate debtor; T0 ~2026-05-16 |
| VIKRAMSOLR | Vikram Solar | very recent (2026-06-19) + NCLAT appeal in progress → may be stayed/overturned; thin lookback (~10m); confirm it sticks |
| TALWALKARS | Talwalkars Better Value Fitness | long-distressed (gym-chain collapse); confirm this is a fresh/relevant CIRP step, single filing |

## DROP — NOT a genuine fresh blow-up (the verification's false-positive catches)
| Symbol | Company | Why dropped |
|---|---|---|
| EMBDL | Embassy Developments | admission **STAYED then SET ASIDE by NCLAT (4 May 2026)**; exited IBC, normal trading restored 6 May 2026 — it WON its appeal → not a blow-up |
| JPPOWER | Jaiprakash Power Ventures | only an **application** filed u/s 7; "matter yet to come up before NCLT" — **not admitted** |
| DHARAN | Dharan Infra-EPC | CIRP then a **stay order received** (Jan 2026) — contested/stayed |

## Why this roster is trustworthy (vs the web-reconstructed IBBI list)
- Source = each company's OWN exchange disclosure (authoritative, correctly dated), read-only from our data.
- Verification caught 3 clear false positives (set-aside, application-only, stayed) — exactly the trap a naive list
  would have swept in (the agent's list included BGR/Manpasand which are similarly stay-contested).
- The dates are real admission dates, not web-search approximations.

## Next (per the locked pre-registration)
1. Lock the KEEP set (+ any resolved FLAGs) as the primary case roster. Confirm the handful of single-filing dates
   (SIGIND, SANCO, ASTRON, TALWALKARS) against the filing PDF / a quick check.
2. For each case: pick ONE matched survivor control (same sector + nearest size, as of T0−18m).
3. Hand-collect promoter-pledge % at T0−12m (and trend) from the NSE shareholding pattern (F2).
4. Score F1–F6 at T0−12m for case + control; apply the §5 kill criteria; then the attack round.
5. Famous pre-2024 names (DHFL, Jet, Cox & Kings, Sintex, Future Retail) = the separate illustrative arm (archival).
