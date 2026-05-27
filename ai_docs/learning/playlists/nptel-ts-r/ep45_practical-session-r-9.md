---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=m7brj3u2PDQ
source_type: video
duration: ~27m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, spectral-analysis, r-lang, periodogram, fft, welch-method, airpassengers]
status: distilled
---

# Ep 45 — Practical Session in R · 9

> **Why Lijo watched this**: To review the hands-on implementation of spectral analysis, periodogram estimation (via FFT), periodogram smoothing, Welch's method, and spectral density estimation for both synthetic and real-world time series datasets (AirPassengers).

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is a code-only practical session where the presenter executes R scripts in RStudio. You do not need to watch it because all of the key scripts, parameter selections, and output diagnostic plots have been fully documented below.

---

## What this episode is actually about (ELI12)

This practical session translates the frequency-domain theory into R code. It covers three main examples:

1.  **A Simple Synthetic Signal**: We generate a time series with two clear cycles (notes) playing at the same time: one slow cycle (0.1 Hz) and one fast cycle (0.3 Hz), plus some background noise. When we plot this data, it just looks like a random, wiggly line. However, when we run it through the Fast Fourier Transform (FFT) to create a periodogram, we see two massive spikes at exactly 0.1 and 0.3. This demonstrates how spectral analysis can "decode" hidden cycles.
2.  **A Decaying Signal**: We simulate a signal that starts strong but dies out over time (exponential decay) at a frequency of 0.15 Hz, with added noise. Its periodogram reveals a clear peak at 0.15, but also displays some secondary, shorter peaks due to the decay effect.
3.  **Real-World AirPassengers Data**: We load the classic monthly airline passenger dataset. Because it has a massive upward trend, we must first difference the data (de-trend it). When we estimate its spectral density, we find a prominent peak at a frequency of $1/12 \approx 0.083$. This frequency corresponds directly to a repeating 12-month (annual) cycle, proving the presence of strong seasonal behavior.

---

## Complete R Script Workflow

Below is the complete R script covered in the session, divided by the three core scenarios:

### Scenario 1: Synthetic Two-Frequency Signal & Smoothing

```R
# 1. Setup Parameters
T_len <- 20                  # Length of the time series
F1 <- 0.1                    # Low-frequency component (0.1 Hz)
F2 <- 0.3                    # High-frequency component (0.3 Hz)
t <- 0:(T_len - 1)           # Time points (0 to 19)

# 2. Generate Sinusoidal Signal with Noise
signal <- 0.5 * sin(2 * pi * F1 * t) + 0.5 * sin(2 * pi * F2 * t)
noise <- 0.2 * rnorm(T_len)   # Standard normal noise scaled by 0.2
ts_data <- signal + noise

# 3. Plot the Raw Synthetic Time Series
plot(t, ts_data, type = "o", col = "blue", 
     main = "Synthetic Time Series (2 Frequencies + Noise)", 
     xlab = "Time", ylab = "Value")

# 4. Compute Raw Periodogram using Fast Fourier Transform (FFT)
fft_values <- fft(ts_data)
# Standardize frequencies up to the Nyquist limit (0 to T/2)
frequencies <- (0:(T_len/2)) / T_len
# Calculate power (periodogram values) using the squared magnitude scaled by 1/T
power <- (abs(fft_values[1:(T_len/2 + 1)])^2) / T_len

# 5. Plot the Raw Periodogram and Highlight Dominant Frequencies
plot(frequencies, power, type = "h", col = "red", lwd = 2,
     main = "Raw Periodogram", xlab = "Frequency (Hz)", ylab = "Power")
abline(v = F1, col = "blue", lty = 2) # Highlight F1 (0.1 Hz)
abline(v = F2, col = "blue", lty = 2) # Highlight F2 (0.3 Hz)
legend("topright", legend = c("True F1 (0.1 Hz)", "True F2 (0.3 Hz)"), 
       col = "blue", lty = 2)

# 6. Smooth the Periodogram (Moving Average Filter)
library(stats)
# Smooth power values using a 3-point moving average filter
smooth_power <- stats::filter(power, rep(1/3, 3), sides = 2)
plot(frequencies, smooth_power, type = "l", col = "purple", lwd = 2,
     main = "Smoothed Periodogram (3-Point Moving Average)", 
     xlab = "Frequency (Hz)", ylab = "Smoothed Power")

# 7. Segmented Periodogram via Welch's Method
# Note: The transcript mispronounced this package as "bpec"
library(bspec) 
# Welch PSD requires a 'ts' object. We define subsegment lengths (seglength) of 10.
psd_welch <- welchPSD(ts(ts_data), seglength = 10)
frequencies_welch <- psd_welch$frequency
power_welch <- psd_welch$power

# Plot Welch's Method Output
plot(frequencies_welch, power_welch, type = "l", col = "darkgreen", lwd = 2,
     main = "Welch's Segmented Periodogram", 
     xlab = "Frequency (Hz)", ylab = "Power Spectral Density")
```

---

### Scenario 2: Exponentially Decaying Sinusoid

```R
# 1. Setup Parameters
T_len2 <- 100                # Larger length for better resolution
F1_decay <- 0.15             # Frequency component (0.15 Hz)
decay_rate <- 0.05           # Exponential decay rate
t2 <- 0:(T_len2 - 1)

# 2. Generate Decaying Signal with Noise
signal_decay <- exp(-decay_rate * t2) * sin(2 * pi * F1_decay * t2)
noise2 <- 0.3 * rnorm(T_len2)
ts_data2 <- signal_decay + noise2

# 3. Plot the Decaying Time Series
plot(t2, ts_data2, type = "o", col = "blue", 
     main = "Exponentially Decaying Sinusoid with Noise", 
     xlab = "Time", ylab = "Value")

# 4. Compute and Plot Periodogram
fft_values2 <- fft(ts_data2)
frequencies2 <- (0:(T_len2/2)) / T_len2
power2 <- (abs(fft_values2[1:(T_len2/2 + 1)])^2) / T_len2

plot(frequencies2, power2, type = "h", col = "red", lwd = 2,
     main = "Periodogram of Decaying Signal", xlab = "Frequency (Hz)", ylab = "Power")
abline(v = F1_decay, col = "blue", lty = 2)

# 5. Smooth the Periodogram using a 5-Point Filter
smooth_power2 <- stats::filter(power2, rep(1/5, 5), sides = 2)
plot(frequencies2, smooth_power2, type = "l", col = "purple", lwd = 2,
     main = "Smoothed Periodogram (5-Point Moving Average)", 
     xlab = "Frequency (Hz)", ylab = "Smoothed Power")

# 6. Alternative: Built-in spectrum function
spectrum(ts_data2, main = "Built-in spectrum() Density Estimate")
```

---

### Scenario 3: Real-World Data (AirPassengers)

```R
# 1. Load and Plot AirPassengers Dataset
data("AirPassengers")
ts_data3 <- AirPassengers
plot(ts_data3, main = "Original AirPassengers Time Series", 
     xlab = "Time", ylab = "Passengers")

# 2. De-trend the Series (First Differencing to achieve stationarity)
detrended_ts <- diff(ts_data3)
plot(detrended_ts, main = "De-trended AirPassengers (First Difference)", 
     xlab = "Time", ylab = "Differenced Passengers")

# 3. Compute Periodogram via FFT
T_len3 <- length(detrended_ts)
fft_values3 <- fft(detrended_ts)
frequencies3 <- (0:(T_len3/2)) / T_len3
power3 <- (abs(fft_values3[1:(T_len3/2 + 1)])^2) / T_len3

# 4. Plot Periodogram and Highlight Annual Seasonality
plot(frequencies3, power3, type = "h", col = "red", lwd = 2,
     main = "Periodogram of De-trended AirPassengers", 
     xlab = "Frequency", ylab = "Power")
# 1/12 frequency corresponds to an annual cycle (once every 12 months)
abline(v = 1/12, col = "blue", lty = 2) 
legend("topright", legend = "1/12 (Annual Cycle Peak)", col = "blue", lty = 2)

# 5. Model-Free Spectral Density Estimation
spectrum(detrended_ts, main = "Spectral Density of De-trended AirPassengers")
```

---

## Diagnostic Workflows & Interpretations

1.  **Frequency Match Verification**:
    When evaluating a periodogram of simulated data, the highest vertical spikes must align exactly with the assigned inputs (e.g., spikes at $\omega = 0.1$ and $\omega = 0.3$ matching $F_1$ and $F_2$). Any auxiliary spikes denote noise artifacts or spectral leakage.
2.  **The Necessity of De-trending**:
    For the `AirPassengers` series, failing to difference the data first would cause a massive spike at $\omega = 0$, representing the secular trend. This dominates and obscures all other cyclical patterns. Removing the trend via differencing exposes the true seasonal cycle peaks.
3.  **Seasonality Detection Rule**:
    If a time series has monthly observations (like `AirPassengers`), a strong peak at frequency $\omega = 1/12 \approx 0.083$ indicates a dominant annual cycle. For quarterly data, an annual cycle would appear as a peak at frequency $\omega = 1/4 = 0.25$.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 35: Implementation of a Pre-Filtering De-trending Step for Multi-Frequency Spectral Strategy Calibration** - Build an automated pre-filtering pipeline in Python that differences (de-trends) and standardizes daily asset price data before calculating the Fast Fourier Transform (FFT). This ensures that long-term price trends do not leak power and swamp the high-frequency cyclic signals (like monthly or weekly institutional rebalancing patterns) in the periodogram.
- **Verdict**: **Pursue** - De-trending is a mandatory prerequisite for using Fourier analysis in finance. Otherwise, the random walk drift will distort the entire estimated spectrum.

---

## Open questions

- In the R `spectrum` function, how are the confidence intervals for the estimated spectral density calculated?
- How does the segmentation length (span) in Welch's method affect the resolution and variance of cycles found in asset price time series?
