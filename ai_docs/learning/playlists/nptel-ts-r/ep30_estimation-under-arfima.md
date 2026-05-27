---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=iPsB2ms8djE
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, long-memory, ARFIMA, GPH-estimator, whittle-estimator, spectral-density, periodogram]
status: distilled
---

# Ep 30 — Estimation under ARFIMA

> **Why Lijo watched this**: To understand the frequency-domain representation of time series, learn how spectral density and periodograms are defined, and master the estimation techniques for the fractional differencing parameter $d$ (GPH, Whittle, MLE, and Yule-Walker).

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture connects time-domain long memory to frequency-domain spectral analysis. Watch **03:18 to 09:41** for the explanation of spectral density and how cycles are superimposed onto time series. Watch **09:42 to 15:13** for the mathematical equations of the Spectral Density Function ($S(f)$) and its sample estimator, the Periodogram ($I(f)$). Watch **16:14 to 20:25** for the GPH (Geweke and Porter-Hudak) log-periodogram regression. Finally, watch **23:52 to 28:59** for the summary of alternative estimators (Whittle, Local Whittle, MLE, Yule-Walker).

---

## What this episode is actually about (ELI12)

So far, we have analyzed time series in the **Time Domain** (looking at how yesterday's price affects today's). In this lecture, we switch to the **Frequency Domain**. 

Instead of looking at a timeline, we imagine the data as a musical chord made of many different sound waves (frequencies) playing at once. We use a math tool called **Spectral Density** to break the chord down and see which frequencies are the loudest (have the highest variance). 

Because we only have a finite sample of data, we estimate this spectral density using a graph called a **Periodogram**.

To estimate the fractional differencing parameter $d$ for our ARFIMA model, we use these frequency tools:
1.  **GPH Estimator**: We plot the log-periodogram against the log-frequencies. The slope of this line ($b$) is directly tied to the fractional differencing parameter ($b = -2d$). We run a simple regression to find the slope and get $d$.
2.  **Whittle Estimator**: A method that compares the sample periodogram to a theoretical model to find the best-fit parameters.
3.  **Maximum Likelihood (MLE)**: Finding the parameters that make our observed data the most likely to occur (accurate but slow).

---

## Key concepts introduced

- **Spectral Density ($S(f)$)** — A frequency-domain representation showing how the variance of a time series is distributed across different cyclical frequencies. Matters because it reveals periodicities and cycles that are hidden in the time domain.
- **Periodogram ($I(f)$)** — The sample estimator of the spectral density function computed from a finite set of observations. Matters because it is the empirical data input for frequency-domain estimators.
- **GPH (Geweke and Porter-Hudak) Estimator** — A semi-parametric method that estimates the fractional integration parameter $d$ using OLS regression on the low-frequency ordinates of the log-periodogram.
- **Whittle Estimator** — An approximate maximum likelihood estimator in the frequency domain that minimizes the difference between the sample periodogram and the theoretical spectral density.
- **Local Whittle Estimator** — A semi-parametric modification of the Whittle estimator that focuses only on a local band of low frequencies to estimate $d$ without needing to specify the AR or MA structures.

---

## Mathematical Formulations

### 1. The Spectral Density Function $S(f)$
For frequency $f \in [-0.5, 0.5]$:

$$S(f) = \lim_{T \to \infty} \frac{1}{T} \left| \sum_{t=0}^{T-1} Y_t e^{-i 2\pi f t} \right|^2$$

Where $i = \sqrt{-1}$, $t$ is time, and $T$ is the number of observations. The term $e^{-i 2\pi f t}$ represents the complex oscillatory behavior at frequency $f$.

### 2. The Periodogram $I(f)$
The sample estimator of $S(f)$ for a finite sample of size $T$:

$$I(f) = \frac{1}{T} \left| \sum_{t=0}^{T-1} Y_t e^{-i 2\pi f t} \right|^2$$

---

## Estimating $d$: The GPH Regressor

The Geweke and Porter-Hudak (1983) estimator utilizes the low-frequency behavior of the log-periodogram.

### Step 1: Fourier Frequencies
Define the harmonic frequencies $\lambda_k = \frac{2\pi k}{T}$ for $k = 1, \dots, g(T)$, where $g(T)$ is a bandwidth parameter limiting the regression to low frequencies.

### Step 2: Regression Model
Fit the log-periodogram regression:

$$\log I(\lambda_k) = a + b \log\left(4 \sin^2(\lambda_k/2)\right) + \epsilon_k$$

*(Simplified course formulation)*:

$$\log I(\lambda_k) \approx a + b \log(\lambda_k) + \epsilon_k$$

### Step 3: Extracting $d$
The OLS slope coefficient $b$ is mathematically related to the fractional integration parameter $d$ by:

$$b = -2d \implies \hat{d}_{GPH} = -\frac{\hat{b}}{2}$$

---

## Alternative Estimation Methods Comparison

| Estimator | Type | How it Works | Pros / Cons |
|---|---|---|---|
| **GPH** | Semi-parametric | Regresses log-periodogram on log-frequency. | **Pros**: Robust to high-frequency noise. **Cons**: Highly sensitive to choice of bandwidth $g(T)$. |
| **Exact MLE** | Parametric | Maximizes joint likelihood of the data in the time domain. | **Pros**: Most statistically efficient. **Cons**: Extremely slow and computationally intensive. |
| **Whittle** | Parametric | Minimizes difference between periodogram and theoretical spectrum. | **Pros**: Faster than exact MLE. **Cons**: Susceptible to model misspecification in the AR/MA parts. |
| **Local Whittle** | Semi-parametric | Focuses the Whittle quasi-likelihood only on low frequencies. | **Pros**: Robust to AR/MA specification, excellent when sample size is limited. |
| **Yule-Walker** | Moment-based | Solves equations matching population ACF to sample ACF. | **Pros**: Simple to calculate. **Cons**: Restricted to pure AR components once $d$ is isolated. |

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 23: Log-Periodogram (GPH) Filtering for Event Volatility Decay** — Implement the GPH estimator in Python (`statsmodels.tsa.fractional_differencing` or custom OLS) to estimate the fractional differencing parameter $d$ of post-filing return volatility. Use this $d$ to dynamically calibrate the decay window of abnormal volatility indicators, preventing strategies from prematurely entering mean-reversion trades before the long-memory shock has fully decayed.
- **Verdict**: **Pursue** — GPH estimation is computationally simple (just a Fourier transform followed by OLS regression), making it fast enough to run in real-time pipelines for market volatility analysis.

---

## Open questions

- What is the optimal bandwidth selection rule (e.g., $g(T) = T^{0.5}$ or $T^{0.6}$) to balance bias and variance when running GPH on financial returns? (Usually, $g(T) = T^{0.5}$ is the standard starting choice).
- The next session is a practical session in R · 6. How is ARFIMA implemented in R, and which package performs the GPH/Whittle estimation out of the box? (R's `fracdiff` package is the standard tool).
