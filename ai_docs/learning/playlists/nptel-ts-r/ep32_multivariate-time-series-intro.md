---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=dqpP8W_HqUU
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, multivariate, vector-processes, linear-algebra, eigenvalues, eigenvectors, random-vector]
status: distilled
---

# Ep 32 — Introduction to Multivariate Time Series

> **Why Lijo watched this**: To understand the motivation behind transitioning from univariate to multivariate time series analysis, and to review the foundational linear algebra (eigenvalues, diagonalization, random vectors) required to model vector systems.

---

## ⏱ Worth watching? SKIM

Verdict: **SKIM**

This is an introductory lecture. You can skip the qualitative examples (finance, weather, US economics) if you are already motivated to study multivariate systems. Focus on **15:30 to 20:30** for the linear algebra refresher on eigenvalues and eigenvectors, and **20:31 to 25:30** for the definition of diagonalization. Watch **25:31 to 28:00** for the definition of random vectors and covariance matrices.

---

## What this episode is actually about (ELI12)

So far, we have only looked at time series one by one—like tracking just the price of Bitcoin. But in the real world, things are connected. Bitcoin rises, and Ethereum often follows. High temperatures in summer lead to low demand for home heating. Heavy rainfall affects wheat yields. 

Multivariate time series analysis is about looking at multiple variables at the same time and modeling how they affect each other. It helps us answer questions like: *"Does Market A lead Market B?"* or *"If Market A suffers a sudden shock, how does that ripple into Market B?"*

To model this mathematically, we bundle the variables into a list called a **Random Vector**. Because we are dealing with multiple dimensions, we must use **Matrix Algebra** (linear algebra). We use concepts like **Eigenvalues** and **Eigenvectors** to simplify complex matrix operations and project these relationships many days into the future.

---

## Key concepts introduced

- **Multivariate Time Series (Vector Processes)** — A framework where multiple related time series variables are modeled and analyzed simultaneously. Matters because it captures cross-series dependencies and improves forecasting accuracy by leveraging auxiliary information.
- **Cross Relationship** — The statistical dependency between different variables at different lags (e.g., how the price of asset X today affects asset Y tomorrow).
- **Eigenvalues & Eigenvectors** — Mathematical roots ($\lambda_i$) and directional vectors ($Q_i$) of a square matrix $A$ satisfying $A Q_i = \lambda_i Q_i$. Matters because they allow matrix diagonalization, which is essential for solving vector systems.
- **Matrix Diagonalization** — The process of transforming a matrix into a diagonal form ($Q^{-1} A Q = \Lambda$) using its eigenvectors. Matters because it simplifies calculating matrix powers ($A^m$), which project relationships across $m$ lags.
- **Random Vector** — A vector whose elements are individual random variables. Matters because it is the standard mathematical format for representing multivariate observations at time $t$.

---

## Linear Algebra & Random Vectors Refresher

### 1. Eigenvalues and Diagonalization
Let $A$ be an $n \times n$ square coefficient matrix:
*   **Characteristic Equation**:
    $$\det(A - \lambda I_n) = 0$$
    The $n$ roots of this equation, $\lambda_1, \dots, \lambda_n$, are the **eigenvalues**.
*   **Eigenvectors**:
    The vectors $Q_1, \dots, Q_n$ satisfying:
    $$A Q_i = \lambda_i Q_i$$
*   **Diagonalization**:
    If $Q = [Q_1, \dots, Q_n]$ is the matrix of eigenvectors, then:
    $$A Q = Q \Lambda \quad \implies \quad Q^{-1} A Q = \Lambda$$
    Where $\Lambda$ is a diagonal matrix of eigenvalues:
    $$\Lambda = \begin{bmatrix} \lambda_1 & 0 & \dots & 0 \\ 0 & \lambda_2 & \dots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \dots & \lambda_n \end{bmatrix}$$
*   **Multi-Lag Projection**:
    $$A^m = Q \Lambda^m Q^{-1}$$
    This identity is used in Vector Autoregression (VAR) to project how shocks propagate over $m$ periods.

### 2. Random Vectors
Let $X = [X_1, X_2, \dots, X_P]^T$ be a $P \times 1$ random vector representing multiple time series variables at time $t$:
*   **Mean Vector ($E[X]$)**:
    $$\mu = [\mu_1, \mu_2, \dots, \mu_P]^T \quad \text{where } \mu_i = E[X_i]$$
*   **Covariance Matrix ($\Sigma$)**:
    The elements of $\Sigma$ represent the variances and covariances:
    $$\Sigma_{ij} = E[(X_i - \mu_i)(X_j - \mu_j)] = \sigma_{ij}$$
    $$\Sigma = \begin{bmatrix} \sigma_{11} & \sigma_{12} & \dots & \sigma_{1P} \\ \sigma_{21} & \sigma_{22} & \dots & \sigma_{2P} \\ \vdots & \vdots & \ddots & \vdots \\ \sigma_{P1} & \sigma_{P2} & \dots & \sigma_{PP} \end{bmatrix}$$
    Where the diagonal elements $\sigma_{ii}$ are the variances, and the off-diagonal elements $\sigma_{ij}$ are the covariances between variables $X_i$ and $X_j$.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 24: Bivariate Volatility Vector Modeling (VAR) for Related Equity Sectors** — Select pairs of highly correlated sector exchange-traded funds (ETFs) or stock return series (e.g., Nifty Bank and Nifty Financial Services) and bundle them into a 2x1 random vector. Calculate their cross-covariances to see if volatility in one sector leads volatility in the other.
- **Verdict**: **Pursue** — Moving beyond univariate models to model sectors jointly is critical for pair trading and identifying lead-lag patterns in information propagation across related markets.

---

## Open questions

- How do we calculate the cross-correlation function (CCF) between two time series, and how do we test if a lag is statistically significant? (This will be covered in the next lecture on Cross-covariance and Cross-correlation).
- How do we extend standard ARMA to vectors? (Vector Autoregression, or VAR, which is covered in the multivariate models lecture).
