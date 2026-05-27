---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=rI4V-aF83JU
source_type: video
duration: ~26m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, spectral-analysis, frequency-domain, fourier-transform, trigonometry, sinusoids]
status: distilled
---

# Ep 42 — Spectral Analysis — Introduction

> **Why Lijo watched this**: To get an intuitive introduction to frequency domain (spectral) analysis, review the trigonometry of sinusoids, and understand the mathematical formulations of the Discrete Fourier Transform (DFT) and its inverse.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture serves as a conceptual pivot from time-domain models (AR, MA, ARIMA) to the frequency-domain. If you are new to Fourier transforms, watch the whole video. Focus on **14:01 to 19:40** for the mathematical definition of the **Discrete Fourier Transform (DFT)** and the derivation showing how symmetric functions reduce to simple cosine expansions. Pay close attention to **19:59 to 21:55** for how a periodic component in levels affects a series' stationarity.

---

## What this episode is actually about (ELI12)

Until now, we have analyzed time series in the **Time Domain**—meaning we model today's value based on yesterday's values and yesterday's shocks. But there is a completely different way to look at data: the **Frequency Domain** (also called **Spectral Analysis**).

Every complex wiggly line (like a temperature series, a sound wave, or a business cycle) is actually made by superimposing a bunch of simple, smooth wave patterns of different heights and speeds. These smooth wave patterns are called **sinusoids** (sine and cosine waves).

Spectral analysis is the process of taking a messy time series and "decomposing" it (breaking it apart) into its constituent sine and cosine waves. It is like running a light beam through a prism to see the individual colors of the rainbow. 

We use a mathematical tool called the **Fourier Transform** to convert our data from time-steps (like daily points) to frequency scores. By looking at these scores, we can easily see which wave speeds are the strongest. For example, if a company's sales show a massive spike at the 12-month wave speed, it tells us that calendar seasonality is the most dominant cycle driving the business.

---

## Key Concepts Introduced

- **Frequency Domain Analysis (Spectral Analysis)** — A time series modeling framework that decomposes a series into periodic sinusoidal components (sine and cosine functions) of varying frequencies.
- **Sinusoid** — A mathematical curve (sine or cosine) that describes a smooth, periodic oscillation.
- **Discrete Fourier Transform (DFT)** — A mathematical transform that converts a discrete sequence of values in the time domain into a representation in the frequency domain.
- **Inverse Fourier Transform** — The mathematical operator that reconstructs the time-domain signal from its frequency-domain representation.
- **Amplitude ($R$)** — The peak height of a sinusoidal wave, measuring the strength of the cycle.
- **Frequency ($\omega$)** — The speed of the oscillation, representing the number of cycles per unit of time (measured in radians, usually bounded within $[0, \pi]$ for discrete series).
- **Phase ($\nu$)** — The starting point (horizontal shift) of the wave at $t=0$.

---

## Mathematical Formulations & Trigonometric Refresher

### 1. Trigonometric Identities
-   **Symmetry**:
    -   $\sin(-a) = -\sin(a)$ (odd function)
    -   $\cos(-a) = \cos(a)$ (even function)
-   **Pi Angles** (for any integer $k$):
    -   $\sin(k\pi) = 0$
    -   $\cos(k\pi) = (-1)^k$ (oscillates between $-1$ and $+1$)
-   **Sum-to-Product**:
    -   $\sin(a) + \sin(b) = 2 \sin\left(\frac{a+b}{2}\right) \cos\left(\frac{a-b}{2}\right)$
    -   $\cos(a) + \cos(b) = 2 \cos\left(\frac{a+b}{2}\right) \cos\left(\frac{a-b}{2}\right)$

---

### 2. Fourier and Inverse Fourier Transforms
Let $h_t$ be a discrete function in the time domain ($t = 0, \pm 1, \pm 2, \dots$):
*   **Discrete Fourier Transform (DFT)**:
    $$H(\omega) = \sum_{t=-\infty}^{\infty} h_t e^{-i\omega t} \quad \text{for } \omega \in [-\pi, \pi]$$
    Where $i = \sqrt{-1}$ and $e^{-i\omega t} = \cos(\omega t) - i\sin(\omega t)$ (Euler's formula).
*   **Inverse Fourier Transform**:
    $$h_t = \frac{1}{2\pi} \int_{-\pi}^{\pi} H(\omega) e^{i\omega t} d\omega$$
*   **Symmetric Function Simplification**:
    If $h_t$ is symmetric ($h_t = h_{-t}$), the imaginary sine components cancel out, reducing the transforms to real-valued cosine series:
    $$H(\omega) = h_0 + 2 \sum_{t=1}^{\infty} h_t \cos(\omega t)$$
    $$h_t = \frac{1}{\pi} \int_{0}^{\pi} H(\omega) \cos(\omega t) d\omega$$

---

### 3. Periodic Components and Stationarity
A time series $Y_t$ containing a periodic component at frequency $\omega$ is modeled as:
$$Y_t = R \cos(\omega t + \nu) + U_t$$
Where $U_t$ is a stationary noise process.
-   **Case A (Non-Stationary)**: If the amplitude $R$ and phase $\nu$ are fixed constants, the mean:
    $$E[Y_t] = R \cos(\omega t + \nu)$$
    depends on time $t$. Therefore, the process is non-stationary.
-   **Case B (Stationary)**: If the amplitude $R$ is a random variable with $E[R]=0$, or if the phase $\nu$ is a random variable uniformly distributed over $[0, 2\pi]$ (independent of $U_t$), then:
    $$E[Y_t] = 0 \quad \text{and} \quad \text{Cov}(Y_t, Y_{t+l}) \text{ depends only on lag } l$$
    Making the process covariance stationary.

---

## Practical Applications of Spectral Analysis

1.  **Signal Processing**: Noise reduction (filtering out specific high-frequency noise from audio), equalization (adjusting frequency bands), and compression (MP3 encoding).
2.  **Image Processing**: Edge detection (identifying high-frequency transitions) and JPEG compression (using the Discrete Cosine Transform, a variant of DFT).
3.  **Communication Systems**: Carrier signal modulation/demodulation (AM, FM, cell phones) and bandwidth optimization.
4.  **Macroeconomics**: Business cycle analysis (extracting the periodicity of economic expansions and recessions).
5.  **Epidemiology**: Analyzing periodic outbreaks of infectious diseases due to seasonal factors or herd immunity.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 32: Seasonality Filtering in Alternative Datasets using Discrete Fourier Transform (DFT)** — Take daily alternative datasets (such as retail foot traffic index or app download velocity) which exhibit strong weekly and annual seasonality. Convert the series to the frequency domain via DFT, identify and zero-out the coefficients corresponding to the weekly ($1/7$) and annual ($1/365$) frequencies, and apply the Inverse DFT. Use the resulting descaled series as a clean indicator for asset returns.
- **Verdict**: **Pursue** — Filtering seasonality in the frequency domain is often much cleaner and faster than using time-domain differencing or moving average filters, which introduce phase shifts and distort the timing of signal spikes.

---

## Open questions

- How does the Autocovariance function of a stationary time series relate to its spectral density? (This is defined by the Wiener-Khinchin theorem: the spectral density is the Fourier transform of the autocovariance function).
- How do we calculate the Fourier transform of a finite sample of data? (We use the Fast Fourier Transform, or FFT, algorithm to compute the discrete periodogram).
