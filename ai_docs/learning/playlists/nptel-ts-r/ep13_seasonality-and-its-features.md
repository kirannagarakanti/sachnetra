---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=uKA1H1Rjigs
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, seasonality, visualization, run-sequence-plot, seasonal-plot, seasonal-subseries-plot]
status: distilled
---

# Ep 13 — Seasonality and its Features

> **Why Lijo watched this**: To understand how to visually detect and analyze seasonality in time series data using standard graphical techniques before modeling it.

---

## ⏱ Worth watching? SKIM

Verdict: **SKIM**

Skip the introductory slides reviewing ARIMA and differencing (first 5 minutes). Jump straight to 08:25 for the definition and causes of seasonality, and then focus on 15:20 to 29:06 for the visual walkthrough of Run Sequence Plots, Seasonal Plots, and Seasonal Subseries Plots. These plots are excellent diagnostic tools for analyzing quarterly or monthly patterns in corporate filings and earnings reports.

---

## What this episode is actually about (ELI12)

Seasonality is a pattern in data that repeats at regular, predictable intervals throughout the year. Think of it like ice cream sales peaking every summer, or warm clothes selling like crazy every winter. 

This episode teaches you how to draw different kinds of graphs to spot these patterns. Instead of just looking at one long timeline, you can slice the data and look at it year-by-year or month-by-month to see if the ups and downs align perfectly across time.

---

## Key concepts introduced

- **Seasonality** — A regular, periodic variation in a time series where the pattern repeats at a fixed interval less than one year (e.g., daily, weekly, quarterly, monthly). Matters because it represents a form of non-stationarity that must be identified and removed (e.g., via lag-D differencing) before fitting standard ARMA models.
- **Seasonal Plot** — A chart where the time series data is plotted against individual seasons (like calendar months) with a separate line/color representing each year. Matters because it allows direct comparison of seasonal patterns across different years and reveals if the seasonality structure is shifting or changing.
- **Seasonal Subseries Plot** — A chart that groups the data by season (e.g., all Januaries, all Februaries) and plots the values for each season chronologically as a mini time series, with a horizontal line indicating the average value for that season. Matters because it highlights both the long-term trend within each individual season and the variability of the seasonal component.

---

## Visual Diagnostic Techniques

The professor walks through three graphical tools to detect seasonality:

### 1. Run Sequence Plot (Simple Time Series Plot)
*   **What it is**: The standard chronological line plot of the data.
*   **What it helps identify**: 
    *   Presence of seasonality (repeating peaks and troughs at fixed intervals).
    *   Shifts in location (mean changes).
    *   Shifts in variation (heteroscedasticity, such as a "fanning out" pattern where variance increases over time).
    *   Outliers.

### 2. Seasonal Plot
*   **What it is**: The x-axis represents the seasonal periods (e.g., Jan to Dec), and each year's data is overlaid as a separate line.
*   **What it helps identify**:
    *   Clearer visualization of the seasonal pattern within a year.
    *   Direct visual comparison between different years (e.g., comparing airline passenger volume in July 1949 vs July 1960).
    *   Changes in the pattern across years (such as shift in peak months).

### 3. Seasonal Subseries Plot
*   **What it is**: Data is partitioned by season (e.g., all January data points first, then all February data points, etc.). Each seasonal group is plotted as a mini-timeline chronologically, with a horizontal line representing the mean of that season.
*   **What it helps identify**:
    *   The evolution of a season over time (e.g., is the volume of January filings increasing year-over-year?).
    *   The relative variance of each season (e.g., are summer travel numbers more volatile than winter ones?).
    *   *Disadvantage*: Difficult to perform between-season comparisons (e.g., comparing July directly to August).

---

## So what for SachNetra?

- **Experiments**: None. (Seasonality is an exploratory concept for base-rate calibration rather than an active trading signal).
- **Verdict**: **Pursue** — The graphical techniques (specifically Seasonal Plot and Seasonal Subseries Plot) are highly relevant for diagnosing filing volume patterns around NSE quarterly earnings announcement seasons.

---

## Open questions

- How do we implement Seasonal Plots and Seasonal Subseries Plots in Python? (`statsmodels.graphics.tsaplots` provides `month_plot` and `quarter_plot` for seasonal subseries, and standard plotting tools can easily create seasonal overlay plots).
- Does seasonal differencing (e.g., lag-4 or lag-12) fully remove seasonality in corporate filings without distorting event signals?
