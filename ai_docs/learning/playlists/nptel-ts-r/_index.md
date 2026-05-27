---
date_started: 2026-05-26
date_last_updated: 2026-05-27
source_url: https://youtube.com/playlist?list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H
presenter: Prof. Sudeep Bapat (IIT Bombay) — NPTEL
total_episodes: 60
episodes_watched: 58
tags: [time-series, statistics, forecasting, arima, garch, r-lang, exploratory]
status: completed
---

# Jan 2025 — Time Series Modelling and Forecasting with Applications in R

> **Why Lijo is watching this series**: Exploratory — understand time series concepts visually and intuitively (graphs over equations) before deciding if any technique is worth testing on SachNetra data.

---

## Series TL;DR (running, refreshed each ingest)

- This is a rigorous 12-week NPTEL stats course (30 hrs) covering basics → ARIMA → GARCH → multivariate → ML applied to time series.
- **Core insight so far**: decompose first → check stationarity → plot ACF+PACF to pick model → fit ARIMA → check residuals for white noise.
- **Model ID table**: ACF cuts off → MA(q); PACF cuts off → AR(p); both tail off → ARMA(p,q).
- **SachNetra frame**: testing detectable deviations from a random walk; ACF/PACF of post-event returns will show whether AR or MA structure exists in the signal.
- R practical sessions every week are skippable (Python-first project); theory lectures are the signal.

---

## Episodes consumed

| # | Date | Title | File | Verdict |
|---|---|---|---|---|
| 01 | 2026-05-26 | Introduction (Course Overview) | [`ep01_introduction.md`](./ep01_introduction.md) | Park — orientation only |
| 02 | 2026-05-26 | What Is Time Series Data? | [`ep02_what-is-time-series.md`](./ep02_what-is-time-series.md) | Park — IID vs time-dependent is the key |
| 03 | 2026-05-26 | Examples — Reading Real Graphs | [`ep03_examples-reading-graphs.md`](./ep03_examples-reading-graphs.md) | Park — trend/seasonality/noise framework |
| 04 | 2026-05-26 | Stationarity | [`ep04_stationarity.md`](./ep04_stationarity.md) | Park — core concept; ACF experiment idea flagged |
| 05 | 2026-05-26 | Weak Stationarity & Non-Stationarity | [`ep05_weak-stationarity.md`](./ep05_weak-stationarity.md) | Park — GARCH bridge built |
| 06 | — | R Practical · 1 | *(skipped)* | Skip — R only |
| 07 | 2026-05-26 | Time Series Decomposition | [`ep07_decomposition.md`](./ep07_decomposition.md) | Park — decompose before modelling; filing data has trend+seasonal |
| 08 | 2026-05-26 | Building Blocks: White Noise, RW, AR, MA, ARMA | [`ep08_building-blocks-ar-ma-arma.md`](./ep08_building-blocks-ar-ma-arma.md) | **Key** — ARIMA vocab complete |
| 09 | 2026-05-26 | ACF, PACF & Model Identification | [`ep09_acf-pacf-model-identification.md`](./ep09_acf-pacf-model-identification.md) | **Key** — the two diagnostic graphs; model-ID table |
| 10 | 2026-05-26 | ACF Shapes for AR and MA Processes | [`ep10_acf-shapes-ar-ma.md`](./ep10_acf-shapes-ar-ma.md) | **Key** — AR tails off; MA cuts off sharply at lag q |
| 12 | 2026-05-26 | Differencing Operators and ARIMA Defined | [`ep12_differencing-and-arima-defined.md`](./ep12_differencing-and-arima-defined.md) | **Key** — the "I" in ARIMA (differencing) and Box-Jenkins methodology |
| 13 | 2026-05-26 | Seasonality and its Features | [`ep13_seasonality-and-its-features.md`](./ep13_seasonality-and-its-features.md) | Visual diagnostic plots (seasonal plot, seasonal subseries plot) |
| 14 | 2026-05-26 | Cyclicality and Tests for Stationarity | [`ep14_cyclicality-and-stationarity-tests.md`](./ep14_cyclicality-and-stationarity-tests.md) | Seasonality vs Cyclicality, Box Plots by Season, Unit Root mechanics, and the four stationarity tests (ADF, KPSS, PP, Variance Ratio) |
| 15 | 2026-05-26 | Seasonality and the SARIMA Model | [`ep15_seasonality-and-sarima-model.md`](./ep15_seasonality-and-sarima-model.md) | Multiplicative SARIMA formulation, deterministic vs stochastic seasonality, regular vs seasonal differencing |
| 16 | 2026-05-26 | Practical Session in R · 3 | [`ep16_practical-session-r-3.md`](./ep16_practical-session-r-3.md) | Hands-on workflow: ADF tests, second differencing, and ARIMA order selection using AIC |
| 17 | 2026-05-26 | Model Identification and Information Criteria | [`ep17_model-identification.md`](./ep17_model-identification.md) | AIC vs BIC penalty structures, visual diagnostic limits, parsimony, and SIACF |
| 18 | 2026-05-26 | Model Estimation and Parameter Selection | [`ep18_model-estimation.md`](./ep18_model-estimation.md) | Parameter estimation methods (MOM, MLE, OLS), ESACF, and MINIC tables |
| 19 | 2026-05-26 | Diagnostic Checking · I (Normality and Serial Correlation) | [`ep19_diagnostic-checking-1.md`](./ep19_diagnostic-checking-1.md) | Standard residual diagnostics: QQ plots, Jarque-Bera/Shapiro-Wilk normality tests, and Ljung-Box/Box-Pierce serial correlation tests |
| 20 | 2026-05-26 | Diagnostic Checking · II (Heteroscedasticity and Volatility) | [`ep20_diagnostic-checking-2.md`](./ep20_diagnostic-checking-2.md) | Volatility analysis: squared residuals diagnostics, White/Breusch-Pagan homoscedasticity tests, and ARCH/GARCH overview |
| 21 | 2026-05-26 | Practical Session in R · 4 | [`ep21_practical-session-r-4.md`](./ep21_practical-session-r-4.md) | Hands-on workflow: residual diagnostics (Shapiro-Wilk/JB normality, Ljung-Box independence, White's heteroscedasticity) and checkresiduals |
| 22 | 2026-05-26 | Forecasting Basics and Minimum MSE Forecasts | [`ep22_forecasting-basics.md`](./ep22_forecasting-basics.md) | In-sample prediction vs out-of-sample forecasting, MMSE derivation using conditional expectations on infinite MA forms, and forecast error variance properties |
| 23 | 2026-05-26 | Measuring Forecast Accuracy and Prediction Intervals | [`ep23_measuring-forecast-accuracy.md`](./ep23_measuring-forecast-accuracy.md) | Asymptotic properties of forecasts, prediction intervals, benefits of parsimony, forecast error metrics (MSE, MAE, MAPE), and Theil's U benchmark |
| 24 | 2026-05-26 | Smoothing Techniques (SMA, EMA) | [`ep24_smoothing-techniques.md`](./ep24_smoothing-techniques.md) | Simple Moving Average (SMA), Exponential Moving Average (EMA) formulations, weighting schemes, and parameter alpha optimization |
| 25 | 2026-05-26 | Double and triple exponential smoothing | [`ep25_double-and-triple-exponential-smoothing.md`](./ep25_double-and-triple-exponential-smoothing.md) | Holt and Holt-Winters formulations, additive/multiplicative seasonality, and parameter alpha/beta/gamma optimization |
| 26 | 2026-05-26 | Practical Session in R · 5 | [`ep26_practical-session-r-5.md`](./ep26_practical-session-r-5.md) | Hands-on workflow: STL decomposition, SMA, EMA, Holt's linear trend, and Holt-Winters seasonal modeling |
| 27 | 2026-05-26 | Persistent and Long-Memory Processes | [`ep27_persistent-and-long-memory-processes.md`](./ep27_persistent-and-long-memory-processes.md) | Theoretical foundation of persistence, memory profiles, hyperbolic decay vs exponential decay in ACF, and anti-persistent processes |
| 28 | 2026-05-26 | ARFIMA Processes | [`ep28_arfima-processes.md`](./ep28_arfima-processes.md) | Mathematical building blocks of ARFIMA, binomial expansions for fractional differencing, Stirling's approximation, and d-based memory classification |
| 29 | 2026-05-26 | Hurst Exponent - Estimation under ARFIMA | [`ep29_hurst-exponent-estimation.md`](./ep29_hurst-exponent-estimation.md) | Non-parametric R/S analysis construction, log-log OLS regression estimation, memory regime classification (H=0.5, H>0.5, H<0.5) |
| 30 | 2026-05-26 | Estimation under ARFIMA | [`ep30_estimation-under-arfima.md`](./ep30_estimation-under-arfima.md) | Spectral density and periodograms, GPH log-periodogram OLS regression, and Whittle/quasi-likelihood estimators |
| 31 | 2026-05-26 | Practical Session in R · 6 | [`ep31_practical-session-r-6.md`](./ep31_practical-session-r-6.md) | Hands-on workflow: ARFIMA simulation (fracdiff.sim), parameter estimation (arfima), residual diagnostics (ACF, PACF, KPSS), and forecasting |
| 32 | 2026-05-26 | Multivariate Time Series Analysis: Examples and Motivation | [`ep32_multivariate-time-series-intro.md`](./ep32_multivariate-time-series-intro.md) | Introduction to vector processes, cross-relationships, and refresher on eigenvalues/diagonalization and random vectors |
| 33 | 2026-05-26 | Cross-covariance and Cross-correlation | [`ep33_cross-covariance-and-cross-correlation.md`](./ep33_cross-covariance-and-cross-correlation.md) | Pursue — lead-lag CCF analysis |
| 34 | 2026-05-26 | Some Specific Multivariate Time Series Models | [`ep34_some-specific-multivariate-models.md`](./ep34_some-specific-multivariate-models.md) | Pursue — linear filtering and VARMA framework |
| 35 | 2026-05-26 | Further Extensions and Use Cases | [`ep35_further-extensions-and-use-cases.md`](./ep35_further-extensions-and-use-cases.md) | Pursue — VAR models, Yule-Walker equations, and applications |
| 36 | 2026-05-26 | Practical Session in R · 7 | [`ep36_practical-session-r-7.md`](./ep36_practical-session-r-7.md) | Hands-on workflow: VAR, VMA, VARMA estimation, forecasting, and diagnostics on Canada macroeconomic dataset |
| 37 | 2026-05-26 | Co-integration - Introduction | [`ep37_cointegration-intro.md`](./ep37_cointegration-intro.md) | Pursue — spurious regression, common stochastic trend, and cointegration vector/rank |
| 38 | 2026-05-26 | Co-integration and Error Correction Model | [`ep38_cointegration-and-error-correction-model.md`](./ep38_cointegration-and-error-correction-model.md) | Pursue — Error Correction Model (ECM) and Speed of Adjustment |
| 39 | 2026-05-26 | Co-integration Tests | [`ep39_cointegration-tests.md`](./ep39_cointegration-tests.md) | Pursue — five main cointegration tests including Johansen and ARDL bounds |
| 40 | 2026-05-26 | Causality Tests | [`ep40_causality-tests.md`](./ep40_causality-tests.md) | Pursue — Granger causality framework, Haugh-Pierce test, and Hsiao's procedure |
| 41 | 2026-05-26 | Practical Session in R · 8 | [`ep41_practical-session-r-8.md`](./ep41_practical-session-r-8.md) | Hands-on workflow: Johansen cointegration test, VECM forecasting, and Haugh-Pierce causality test |
| 42 | 2026-05-26 | Spectral Analysis — Introduction | [`ep42_spectral-analysis-intro.md`](./ep42_spectral-analysis-intro.md) | Park — introductory concepts of frequency domain analysis and Fourier transforms |
| 43 | 2026-05-26 | Spectral Density Function | [`ep43_spectral-density-function.md`](./ep43_spectral-density-function.md) | Pursue — Wiener-Khinchin theorem and specific processes' SDF curves |
| 44 | 2026-05-26 | Spectral Density Estimation | [`ep44_spectral-density-estimation.md`](./ep44_spectral-density-estimation.md) | Pursue — Parametric vs non-parametric spectral estimation and periodogram mechanics |
| 45 | 2026-05-26 | Practical Session in R · 9 | [`ep45_practical-session-r-9.md`](./ep45_practical-session-r-9.md) | Hands-on workflow: periodogram estimation, smoothing (stats::filter), Welch's method (bspec), and de-trending (AirPassengers) |
| 46 | 2026-05-26 | Stochastic Volatility Modelling | [`ep46_stochastic-volatility-modelling.md`](./ep46_stochastic-volatility-modelling.md) | Pursue — stylized facts of return volatility and conditional variance mechanics |
| 47 | 2026-05-26 | ARCH Models | [`ep47_arch-models.md`](./ep47_arch-models.md) | Pursue — formal framework of ARCH(m) and analytical derivation of ARCH(1) |
| 48 | 2026-05-26 | ARCH LM Test and GARCH Models | [`ep48_arch-lm-test-and-garch-models.md`](./ep48_arch-lm-test-and-garch-models.md) | Pursue — ARCH LM test mechanics, general GARCH(p,q), and GARCH(1,1) properties |
| 49 | 2026-05-26 | GARCH Model Extensions | [`ep49_garch-model-extensions.md`](./ep49_garch-model-extensions.md) | Pursue — GJR-GARCH, EGARCH, FIGARCH, DCC-GARCH, and GARCH-X models |
| 50 | 2026-05-26 | Practical Session in R · 10 | [`ep50_practical-session-r-10.md`](./ep50_practical-session-r-10.md) | Hands-on workflow: GARCH simulation (fGarch), fitting standard GARCH and ARMA-GARCH (rugarch), and forecasting volatility on NYSE |
| 51 | 2026-05-26 | Nonlinear Time Series Models | [`ep51_nonlinear-time-series-models.md`](./ep51_nonlinear-time-series-models.md) | Pursue — linear vs nonlinear processes, regimes, piecewise linearity, and switching mechanics |
| 52 | 2026-05-26 | Regimes and Nonlinear Models | [`ep52_regimes-and-nonlinear-models.md`](./ep52_regimes-and-nonlinear-models.md) | Pursue — threshold-based, smooth transition, and Markov switching regime mathematical formulations |
| 53 | 2026-05-27 | Nonlinear Model Extensions | [`ep53_nonlinear-model-extensions.md`](./ep53_nonlinear-model-extensions.md) | Pursue — SETAR, MTAR, LSTAR, and ESTAR formulations and transition functions |
| 54 | 2026-05-27 | Markov Switching Models | [`ep54_markov-switching-models.md`](./ep54_markov-switching-models.md) | Pursue — MS-AR model structure, transition matrix, and Hamilton/Kim filter mechanics |
| 55 | 2026-05-27 | Practical Session in R · 11 | [`ep55_practical-session-r-11.md`](./ep55_practical-session-r-11.md) | Skip — R simulation, setarTest, Keenan/Tsay linearity tests, and Nile/Sunspot dataset modeling |
| 56 | 2026-05-27 | Machine Learning in Time Series | [`ep56_machine-learning-in-time-series.md`](./ep56_machine-learning-in-time-series.md) | Pursue — ML taxonomy, feature engineering lag creation, and hybrid ARIMA-Neural Network architectures |
| 57 | 2026-05-27 | Linear Regression for Time Series and Beyond | [`ep57_linear-regression-time-series-beyond.md`](./ep57_linear-regression-time-series-beyond.md) | Pursue — linear regression, SVR formulations, and Random Forest feature selection and extrapolation limits |
| 58 | 2026-05-27 | Other Machine Learning Models for Time Series | [`ep58_other-machine-learning-models.md`](./ep58_other-machine-learning-models.md) | Pursue — KNN lag-space similarity matching, Euclidean distance metrics, and Naive Bayes classification |
| 59 | 2026-05-27 | Neural Networks for Time Series | [`ep59_neural-networks-time-series.md`](./ep59_neural-networks-time-series.md) | Pursue — Perceptron formulation, activation functions (sigmoid/tanh), and NNAR(p,k) model structures |
| 60 | 2026-05-27 | Practical Session in R · 12 | [`ep60_practical-session-r-12.md`](./ep60_practical-session-r-12.md) | Skip — R implementation of linear regression, KNN pattern classification, Random Forest, and NNAR models |

---

## Episode catalogue (full — 12-week NPTEL course)

> Tick off as you go. Each watched episode gets a proper `epNN_<slug>.md` distillation and a row added above in **Episodes consumed**.

### Week 01 — Introduction
- [x] Ep 01 — Introduction (Course Overview) → [`ep01_introduction.md`](./ep01_introduction.md)
- [x] Ep 02 — What Is Time Series Data? → [`ep02_what-is-time-series.md`](./ep02_what-is-time-series.md)
- [x] Ep 03 — Examples — Reading Real Graphs → [`ep03_examples-reading-graphs.md`](./ep03_examples-reading-graphs.md)
- [x] Ep 04 — Stationarity → [`ep04_stationarity.md`](./ep04_stationarity.md)
- [x] Ep 05 — Weak Stationarity & Non-Stationarity → [`ep05_weak-stationarity.md`](./ep05_weak-stationarity.md)
- [x] Ep 06 — Practical session in R · 1 *(skipped)*

### Week 02 — Basics & Decomposition
- [x] Ep 07 — Time Series Decomposition → [`ep07_decomposition.md`](./ep07_decomposition.md)
- [x] Ep 08 — Building Blocks: White Noise, RW, AR, MA, ARMA → [`ep08_building-blocks-ar-ma-arma.md`](./ep08_building-blocks-ar-ma-arma.md)
- [x] Ep 09 — ACF, PACF & Model Identification → [`ep09_acf-pacf-model-identification.md`](./ep09_acf-pacf-model-identification.md)
- [x] Ep 10 — ACF Shapes for AR and MA Processes → [`ep10_acf-shapes-ar-ma.md`](./ep10_acf-shapes-ar-ma.md)
- [x] Ep 11 — Practical session in R · 2 *(skipped)*

### Week 03 — Non-Stationarity & Seasonality
- [x] Ep 12 — Non-Stationary Time Series → [`ep12_differencing-and-arima-defined.md`](./ep12_differencing-and-arima-defined.md)
- [x] Ep 13 — Seasonality and its Features → [`ep13_seasonality-and-its-features.md`](./ep13_seasonality-and-its-features.md)
- [x] Ep 14 — Cyclicality and Test for Stationarity → [`ep14_cyclicality-and-stationarity-tests.md`](./ep14_cyclicality-and-stationarity-tests.md)
- [x] Ep 15 — Seasonality and SARIMA Model → [`ep15_seasonality-and-sarima-model.md`](./ep15_seasonality-and-sarima-model.md)
- [x] Ep 16 — Practical session in R · 3 → [`ep16_practical-session-r-3.md`](./ep16_practical-session-r-3.md)

### Week 04 — Model Identification & Diagnostics
- [x] Ep 17 — Model identification → [`ep17_model-identification.md`](./ep17_model-identification.md)
- [x] Ep 18 — Model estimation → [`ep18_model-estimation.md`](./ep18_model-estimation.md)
- [x] Ep 19 — Diagnostic checking · 1 → [`ep19_diagnostic-checking-1.md`](./ep19_diagnostic-checking-1.md)
- [x] Ep 20 — Diagnostic checking · 2 → [`ep20_diagnostic-checking-2.md`](./ep20_diagnostic-checking-2.md)
- [x] Ep 21 — Practical session in R · 4 → [`ep21_practical-session-r-4.md`](./ep21_practical-session-r-4.md)

### Week 05 — Forecasting Methods
- [x] Ep 22 — Forecasting basics → [`ep22_forecasting-basics.md`](./ep22_forecasting-basics.md)
- [x] Ep 23 — Measuring forecast accuracy → [`ep23_measuring-forecast-accuracy.md`](./ep23_measuring-forecast-accuracy.md)
- [x] Ep 24 — Smoothing techniques (SMA, EMA) → [`ep24_smoothing-techniques.md`](./ep24_smoothing-techniques.md)
- [x] Ep 25 — Double and triple exponential smoothing → [`ep25_double-and-triple-exponential-smoothing.md`](./ep25_double-and-triple-exponential-smoothing.md)
- [x] Ep 26 — Practical session in R · 5 → [`ep26_practical-session-r-5.md`](./ep26_practical-session-r-5.md)

### Week 06 — Persistent & Long-Memory Processes
- [x] Ep 27 — Persistent and Long-Memory Processes → [`ep27_persistent-and-long-memory-processes.md`](./ep27_persistent-and-long-memory-processes.md)
- [x] Ep 28 — ARFIMA Processes → [`ep28_arfima-processes.md`](./ep28_arfima-processes.md)
- [x] Ep 29 — Hurst Exponent - Estimation under ARFIMA → [`ep29_hurst-exponent-estimation.md`](./ep29_hurst-exponent-estimation.md)
- [x] Ep 30 — Estimation under ARFIMA → [`ep30_estimation-under-arfima.md`](./ep30_estimation-under-arfima.md)
- [x] Ep 31 — Practical Session in R · 6 → [`ep31_practical-session-r-6.md`](./ep31_practical-session-r-6.md)

### Week 07 — Multivariate Time Series Analysis
- [x] Ep 32 — Multivariate Time Series Analysis: Examples and Motivation → [`ep32_multivariate-time-series-intro.md`](./ep32_multivariate-time-series-intro.md)
- [x] Ep 33 — Cross-covariance and Cross-correlation → [`ep33_cross-covariance-and-cross-correlation.md`](./ep33_cross-covariance-and-cross-correlation.md)
- [x] Ep 34 — Some Specific Multivariate Time Series Models → [`ep34_some-specific-multivariate-models.md`](./ep34_some-specific-multivariate-models.md)
- [x] Ep 35 — Further Extensions and Use Cases → [`ep35_further-extensions-and-use-cases.md`](./ep35_further-extensions-and-use-cases.md)
- [x] Ep 36 — Practical Session in R · 7 → [`ep36_practical-session-r-7.md`](./ep36_practical-session-r-7.md)

### Weeks 08–10 — Advanced Topics
- [x] Ep 37 — Co-integration - Introduction → [`ep37_cointegration-intro.md`](./ep37_cointegration-intro.md)
- [x] Ep 38 — Co-integration and Error Correction Model → [`ep38_cointegration-and-error-correction-model.md`](./ep38_cointegration-and-error-correction-model.md)
- [x] Ep 39 — Co-integration Tests → [`ep39_cointegration-tests.md`](./ep39_cointegration-tests.md)
- [x] Ep 40 — Causality Tests → [`ep40_causality-tests.md`](./ep40_causality-tests.md)
- [x] Ep 41 — Practical Session in R · 8 → [`ep41_practical-session-r-8.md`](./ep41_practical-session-r-8.md)
- [x] Ep 42 — Spectral Analysis — Introduction → [`ep42_spectral-analysis-intro.md`](./ep42_spectral-analysis-intro.md)
- [x] Ep 43 — Spectral Density Function → [`ep43_spectral-density-function.md`](./ep43_spectral-density-function.md)
- [x] Ep 44 — Spectral Density Estimation → [`ep44_spectral-density-estimation.md`](./ep44_spectral-density-estimation.md)
- [x] Ep 45 — Practical Session in R · 9 → [`ep45_practical-session-r-9.md`](./ep45_practical-session-r-9.md)
- [x] Ep 46 — Stochastic Volatility Modelling → [`ep46_stochastic-volatility-modelling.md`](./ep46_stochastic-volatility-modelling.md)
- [x] Ep 47 — ARCH Models → [`ep47_arch-models.md`](./ep47_arch-models.md)
- [x] Ep 48 — ARCH LM Test and GARCH Models → [`ep48_arch-lm-test-and-garch-models.md`](./ep48_arch-lm-test-and-garch-models.md)
- [x] Ep 49 — GARCH Model Extensions → [`ep49_garch-model-extensions.md`](./ep49_garch-model-extensions.md)
- [x] Ep 50 — Practical Session in R · 10 → [`ep50_practical-session-r-10.md`](./ep50_practical-session-r-10.md)

### Week 11 — Nonlinear Models
- [x] Ep 51 — Nonlinear Time Series Models → [`ep51_nonlinear-time-series-models.md`](./ep51_nonlinear-time-series-models.md)
- [x] Ep 52 — Regimes and nonlinear models → [`ep52_regimes-and-nonlinear-models.md`](./ep52_regimes-and-nonlinear-models.md)
- [x] Ep 53 — Nonlinear model extensions → [`ep53_nonlinear-model-extensions.md`](./ep53_nonlinear-model-extensions.md)
- [x] Ep 54 — Markov switching models → [`ep54_markov-switching-models.md`](./ep54_markov-switching-models.md)
- [x] Ep 55 — Practical session in R · 11 → [`ep55_practical-session-r-11.md`](./ep55_practical-session-r-11.md)

### Week 12 — Machine Learning in Time Series
- [x] Ep 56 — Machine learning in time series → [`ep56_machine-learning-in-time-series.md`](./ep56_machine-learning-in-time-series.md)
- [x] Ep 57 — Linear regression for time series and beyond → [`ep57_linear-regression-time-series-beyond.md`](./ep57_linear-regression-time-series-beyond.md)
- [x] Ep 58 — Other machine learning models for time series → [`ep58_other-machine-learning-models.md`](./ep58_other-machine-learning-models.md)
- [x] Ep 59 — Neural networks for time series → [`ep59_neural-networks-time-series.md`](./ep59_neural-networks-time-series.md)
- [x] Ep 60 — Practical session in R · 12 → [`ep60_practical-session-r-12.md`](./ep60_practical-session-r-12.md)

---

## Running synthesis — state of the market (per this series)

*Not started yet. Will grow as episodes are distilled.*

---

## Cumulative SachNetra impact

> Aggregate across all episodes. Re-derived at each ingest, not appended.

**Experiments**:
- Added from this series:
  - **Exp 11**: Unit Root Diagnostic Pipeline (ADF + KPSS) for stationarity checking.
  - **Exp 12**: Quarterly Filing Volume Forecasting using multiplicative SARIMA.
  - **Exp 13**: AIC/BIC Automated Order Search (Auto-ARIMA) for abnormal return models.
  - **Exp 14**: Compare MOM vs. MLE Parameter Sensitivity for AR(1) Abnormal Returns.
  - **Exp 15**: Post-ARIMA Quality Control Pipeline (Residual Ljung-Box test).
  - **Exp 16**: Volatility Diagnostic Pipeline (Squared Residual Ljung-Box test).
  - **Exp 17**: Backtest Benchmarking via Theil's U against naive forecasts.
  - **Exp 18**: Adaptive EMA for Event Return Diagnostics via alpha optimization.
  - **Exp 19**: Holt-Winters Multiplicative Smoothing for volume & spread cycles.
  - **Exp 20**: Hurst Exponent ($H$) calculation for long-memory vs mean-reverting regimes.
  - **Exp 21**: Fractional Integration (ARFIMA) vs Integer Differencing (ARIMA) for volatility.
  - **Exp 22**: Dynamic Regime Switching via Rolling Hurst Exponent ($H$).
  - **Exp 23**: Log-Periodogram (GPH) Estimator for calibrating decay parameters.
  - **Exp 24**: Bivariate Volatility Vector Modeling (VAR) for cross-sector ETF spillovers.
  - **Exp 25**: Lead-Lag Cross-Correlation (CCF) for filings vs volatility spikes.
  - **Exp 26**: Bivariate VMA(1) modeling for order book depth and spread dynamics.
  - **Exp 27**: Sector return spillovers evaluation via Bivariate VAR(2) modeling.
  - **Exp 28**: Engle-Granger two-step cointegration test for pair-trading.
  - **Exp 29**: Dynamic Portfolio Rebalancing via Engle-Granger Error Correction Models (ECM).
  - **Exp 30**: Mixed-Frequency Cointegration via ARDL Bounds Testing for macro indicators.
  - **Exp 31**: Lead-Lag Granger Causality Testing via Hsiao's procedure.
  - **Exp 32**: Seasonality Filtering in alternative datasets using Discrete Fourier Transform (DFT).
  - **Exp 33**: Diagnostic Classification of Volatility Regimes via Spectral Slope Analysis.
  - **Exp 34**: Non-Parametric Market Cycle Detection using Daniell-smoothed periodograms.
  - **Exp 35**: Pre-Filtering De-trending Step for Fast Fourier Transform (FFT) inputs.
  - **Exp 36**: Cross-Asset Volatility Clustering and spillover analysis in earnings windows.
  - **Exp 37**: ARCH(1) vs 20-day Historical Volatility for post-event sizing.
  - **Exp 38**: GARCH(1,1) vs ARCH(5) Parameter Efficiency and MLE convergence.
  - **Exp 39**: Asymmetric GJR-GARCH option pricing and delta hedging.
  - **Exp 40**: Verification of Python `arch` package MLE consistency with R `rugarch`.
  - **Exp 41**: Multi-Regime Volatility Threshold (TAR) modeling for strategy execution.
  - **Exp 42**: LSTAR vs Abrupt TAR for post-event volatility transitions.
  - **Exp 43**: ESTAR vs Linear AR for transaction-cost-bound spread arbitrage.
  - **Exp 44**: 2-Regime Markov Switching AR (MS-AR) for latent drift states.
  - **Exp 45**: Hybrid ARIMA-LSTM Residual Modeling for drift tracking.
  - **Exp 46**: SVR with RBF kernel vs Random Forest for spread extrapolation.
  - **Exp 47**: KNN-Based Chart Pattern Matching using Euclidean distance.
  - **Exp 48**: NNAR($p, k$) Volatility Forecasting vs GARCH(1,1) under regime shifts.
- Killed from this series: *none*

**Roadmap changes**:
- Added a systematic diagnostic pipeline: check stationarity (ADF/KPSS) $\to$ check linear structures (ARIMA/SARIMA) $\to$ test residuals (Ljung-Box) $\to$ check GARCH effects (Squared Residual Ljung-Box) $\to$ fit GARCH/GJR-GARCH.
- Integrated fractional differencing (ARFIMA) and spectral analysis (DFT/periodogram) into volatility decay modeling.
- Integrated regime switching (TAR/LSTAR/ESTAR/MS-AR) and machine learning (SVR/Random Forest/NNAR) for handling complex post-earnings drifts and volatility shifts.

**Pursue / Park / Kill — series-level verdict**:
- Verdict: **Pursue**
- Reason: The series successfully maps time-series frameworks to concrete event-driven trading experiments, identifying cointegration (VECM), asymmetric volatility modeling (EGARCH), and non-linear transitions (ESTAR/MS-AR) as highly viable signal refinement engines for SachNetra.

---

## Open questions across the series

- Is any forecasting technique here actually applicable to SachNetra's event-driven (not price-driven) data?
- Does GARCH coverage in Week 06–10 go deeper than what we already validated in Exp 7/9?
- Are the R practical sessions worth watching or skip-able (since we're Python-first)?

---

## Wiki impact

- **Created from this series**: *none yet*
- **Updated from this series**: *none yet*
- **Log entries**: *none yet*
