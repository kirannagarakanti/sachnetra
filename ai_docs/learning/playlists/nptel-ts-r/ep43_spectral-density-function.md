---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=CzDv2rY4YcI
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, spectral-density, spectral-representation, white-noise, autoregressive, moving-average, random-walk]
status: distilled
---

# Ep 43 — Spectral Density Function

> **Why Lijo watched this**: To study the Spectral Representation Theorem (SRT), understand the properties of the Spectral Density Function (SDF), and derive the closed-form SDF equations for White Noise, AR(1), MA(q), and Random Walk processes.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture establishes the core mathematical foundation of frequency-domain time series analysis. Focus on **4:50 to 7:14** for the definition of the Spectral Representation Theorem. The most important section is **9:30 to 17:15**, which defines the Spectral Density Function as the Fourier transform of the autocovariance function, including its symmetry, non-negativity, and total variance integration properties. Watch **20:30 to 28:05** for the derivation of specific SDF shapes (flat spectrum for white noise, divergent spectrum for random walks).

---

## What this episode is actually about (ELI12)

When you look at a time series, you are looking at it in the time domain. If you want to know how it behaves in terms of cycles and waves, you convert it into the frequency domain using a formula called the **Spectral Density Function (SDF)**.

Think of a time series like a complex musical chord. The chord is made by playing several notes (frequencies) at different volumes (amplitudes) at the same time. The SDF is like a graphic equalizer on a stereo. It shows a chart of all possible note pitches along the horizontal axis, and the volume of each note along the vertical axis. 

By analyzing the SDF, we can decode the series:
-   **Low Frequencies (left side)**: Represent very slow, long-term trends or long cycles (like business cycles that take years).
-   **High Frequencies (right side)**: Represent rapid, jittery movements or noise (like day-to-day market volatility).
-   **Peaks**: If the chart has a giant spike at a particular pitch, it means that specific cycle is driving the entire series (like a 12-month calendar cycle in retail sales).

The lecture derives the "equalizer charts" for standard time series models:
1.  **White Noise**: Its equalizer chart is a flat, horizontal line. All frequencies have the exact same volume. This is why it is called "white" noise, just like white light contains all colors of the rainbow equally.
2.  **Random Walk**: Its equalizer chart shoots up to infinity at the far-left side (zero frequency). This infinity spike represents the non-stationary trend that never repeats itself.

---

## Key Concepts Introduced

- **Spectral Representation Theorem (SRT)** — The theorem stating that any stationary time series can be represented as an integral of sinusoids with uncorrelated, random coefficients over a frequency range.
- **Spectral Density Function (SDF) / Power Spectrum ($S(\omega)$)** — A function that shows how the total variance of a time series is partitioned across different frequencies.
- **SDF Symmetry** — The property $S(\omega) = S(-\omega)$ for real-valued time series. Matters because we only need to estimate and plot the spectrum for positive frequencies $[0, \pi]$.
- **Wiener-Khinchin Theorem** — The mathematical duality stating that the autocovariance function $\gamma(h)$ and the spectral density function $S(\omega)$ are Fourier transform pairs.
- **Low-Frequency Dominance** — A spectral shape where power is concentrated near $\omega = 0$. Indicative of high positive serial correlation and slow-moving trends.
- **High-Frequency Dominance** — A spectral shape where power is concentrated near $\omega = \pi$. Indicative of negative serial correlation and rapid, mean-reverting oscillations.

---

## Mathematical Formulations & Derivations

### 1. Spectral Representation Theorem (SRT)
Any weakly stationary time series $Y_t$ can be expressed as:
$$Y_t = \int_{-\pi}^{\pi} e^{i\omega t} Z(d\omega)$$
Where $Z(d\omega)$ is a complex-valued stochastic process with orthogonal (uncorrelated) increments, representing the contribution of frequency $\omega$ to the overall series.

---

### 2. Spectral Density Function (SDF) Definition
The spectral density function $S(\omega)$ of a stationary series $Y_t$ is the Discrete Fourier Transform of its autocovariance function $\gamma(h)$:
$$S(\omega) = \frac{1}{2\pi} \sum_{h=-\infty}^{\infty} \gamma(h) e^{-i\omega h} \quad \text{for } \omega \in [-\pi, \pi]$$

#### Key Properties:
1.  **Symmetry**: $S(\omega) = S(-\omega)$ (since $\gamma(h)$ is real and symmetric).
2.  **Non-Negativity**: $S(\omega) \ge 0$ for all $\omega$.
3.  **Total Variance (Wiener-Khinchin relation)**: The total variance of the series is the integral of the spectral density:
    $$\gamma(0) = \text{Var}(Y_t) = \int_{-\pi}^{\pi} S(\omega) d\omega$$
4.  **Periodicity**: $S(\omega + 2\pi) = S(\omega)$.
5.  **Inverse Transform (Reconstruction)**:
    $$\gamma(h) = \int_{-\pi}^{\pi} S(\omega) e^{i\omega h} d\omega$$

---

### 3. Closed-Form SDF for Specific Processes

#### A. White Noise
For $Y_t \sim \text{WN}(0, \sigma^2)$, the autocovariance is $\gamma(0) = \sigma^2$ and $\gamma(h) = 0$ for $h \ne 0$.
$$S(\omega) = \frac{1}{2\pi} \sum_{h=-\infty}^{\infty} \gamma(h) e^{-i\omega h} = \frac{\sigma^2}{2\pi}$$
*   **Spectrum**: Flat constant line. All frequencies have equal power (white noise spectrum).

#### B. Autoregressive Process of Order 1, AR(1)
For $Y_t = \phi Y_{t-1} + \epsilon_t$ with $|\phi| < 1$ and $\epsilon_t \sim \text{WN}(0, \sigma^2)$:
$$S(\omega) = \frac{\sigma^2}{2\pi (1 - 2\phi \cos(\omega) + \phi^2)}$$
*   **If $\phi > 0$**: The denominator is minimized at $\omega = 0$, so $S(\omega)$ peaks at frequency 0. Low frequencies dominate (smooth, persistent path).
*   **If $\phi < 0$**: The denominator is minimized at $\omega = \pi$, so $S(\omega)$ peaks at frequency $\pi$. High frequencies dominate (rapidly oscillating path).

#### C. Moving Average Process of Order $q$, MA($q$)
For $Y_t = \epsilon_t + \theta_1 \epsilon_{t-1} + \dots + \theta_q \epsilon_{t-q}$ with $\epsilon_t \sim \text{WN}(0, \sigma^2)$:
$$S(\omega) = \frac{\sigma^2}{2\pi} \left| 1 + \theta_1 e^{-i\omega} + \dots + \theta_q e^{-iq\omega} \right|^2$$
*   **Spectrum**: A smooth, continuous curve. Unlike AR processes, the MA spectrum does not contain sharp spikes because it has a finite memory cutoff.

#### D. Random Walk (Non-Stationary)
For $Y_t = Y_{t-1} + \epsilon_t$ with $\epsilon_t \sim \text{WN}(0, \sigma^2)$ (formally modeled by taking the limit $\phi \to 1$ in AR(1)):
$$S(\omega) = \frac{\sigma^2}{2\pi (2 - 2 \cos(\omega))}$$
*   **Spectrum**: As $\omega \to 0$, $\cos(\omega) \to 1$, making the denominator $(2 - 2) = 0$. Thus, $S(\omega) \to \infty$ at frequency 0. This divergence is the spectral signature of a non-stationary unit root.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 33: Diagnostic Classification of Asset Class Volatility Regimes via Spectral Slope Analysis** - Retrieve daily prices of equities, commodities, and bonds. Difference to get stationary returns, compute their sample spectral densities, and calculate the slope of the log-log spectral density plot. Use the spectral slope to classify assets: flat slopes represent pure random walks (efficient markets), while steep negative slopes indicate persistent trending regimes suitable for trend-following strategies.
- **Verdict**: **Pursue** - Spectral slope analysis is a robust way to quantify market efficiency and classify volatility regimes. It complements time-domain metrics like the Hurst exponent and runs test.

---

## Open questions

- How do we estimate the sample spectral density function from a finite dataset? (This is done using the periodogram, which is the sample equivalent of the SDF, estimated via FFT).
- How do we smooth the periodogram to get a consistent estimator of the true spectral density? (Raw periodograms are inconsistent estimators; we must apply spectral windows like Daniell, Bartlett, or Parzen windows to smooth the estimate).
