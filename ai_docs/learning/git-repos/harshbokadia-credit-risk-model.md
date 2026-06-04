---
github_url: https://github.com/harshbokadia/credit_risk_model_project
owner: harshbokadia
repo: credit_risk_model_project
license: Unknown
language: Python
last_commit: Unknown
stars: 1
audience: professional
tags: [machine-learning, xgboost, shap, credit-risk, business-impact]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# credit_risk_model_project — Quantifying ML Business Impact

> **Why Lijo added this**: While it's a credit risk model (not equity trading), the repo excels at translating raw machine learning metrics (F1, AUC) into **quantifiable business dollar impact**, which is exactly how we need to present our SachNetra NLP alpha signals to founders/investors.

---

## TL;DR (3 bullets)

- End-to-end ML pipeline predicting credit card default on 30,000 real records.
- Uses XGBoost + SMOTE (for imbalanced classes) and SHAP (for explainability).
- **Core value for us**: Step 05 (`05_business_impact.py`) runs cutoff simulations and calculates the Expected Loss to prove a specific net monetary benefit (NT$11M+) of deploying the model.

---

## ELI12 — what is this repo?

Building an AI model that predicts if someone will default on a loan is cool, but a bank manager will ask: "How much money does this actually save us?" This repo shows exactly how to answer that question. It maps the AI's predictions (true positives, false positives) directly to actual dollar costs (money lost from defaults vs. money lost from rejecting good customers) and outputs a final "Net Dollars Saved" metric.

---

## Architecture snapshot

**Stack**: Python, XGBoost, Scikit-learn, SHAP, Optuna, Streamlit.

**Key Operations**:
- `02_segmentation.py` — K-Means customer segmentation to build risk personas.
- `04_modeling.py` — XGBoost model trained with SMOTE to handle the imbalanced dataset.
- `05_business_impact.py` — Translates the confusion matrix into a P&L (Profit and Loss) statement.

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Business Value Simulation | `notebooks/05_business_impact.py` | Models should not be judged solely on AUC/F1. Mapping the confusion matrix directly to Expected Loss provides an objective ROI for deploying the model in production. |
| 2 | Behavioral Risk Personas | `notebooks/02_segmentation.py` | Before running supervised classification (default or not), running unsupervised K-Means provides interpretable "personas" that help explain *why* someone is high risk. |

---

## Feature quality assessment

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| P&L Impact Simulation | Excellent | `notebooks/05_business_impact.py` | The explicit calculation of net benefit in a currency value bridges the gap between data science and business strategy. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Signal Backtesting | Better | `scripts/research/` | Excellent | +1 | We backtest alpha signals, but we usually just show a cumulative return chart. We need to translate this into "Expected AUM Alpha" or "Expected Yield over Benchmark" in hard INR values. |

---

## Best to have in SachNetra

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P1 | P&L Cutoff Simulation Framework | Excellent | Better | `notebooks/05_business_impact.py` | Lijo | Pursue |

---

## SachNetra comparison

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| Success Metric | Net Benefit ($) | Cumulative Return (%) | minor | When presenting NLP signal efficacy, we should add a simulation layer that assumes a ₹10Cr AUM and calculates the exact INR value generated after transaction costs. |

---

## Improvement backlog

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Add P&L impact simulation to Backtest outputs | Lijo | S | Pursue | Update our VectorBT scripts to explicitly output INR Alpha over Benchmark assuming a standard portfolio size. |

---

## Wiki impact
- **Created**: `harshbokadia-credit-risk-model.md`
- **Status after promote**: stays `documented`
