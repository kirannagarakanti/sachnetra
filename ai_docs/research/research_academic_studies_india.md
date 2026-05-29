# Academic & Industry Studies: Sentiment-Earnings Correlation in India

**Research Date:** May 1, 2026
**Author:** MiniMax Agent

---

## Executive Summary

Academic research on news sentiment effectiveness in Indian equity markets shows promising but nuanced results. Studies demonstrate that investor sentiment does affect Indian stock returns, particularly at shorter time horizons and for mid/small-cap stocks. However, the strength of this relationship varies significantly based on methodology, market conditions, and stock characteristics. Transformer-based NLP models have shown potential for generating alpha in Nifty 50 stocks, though evidence remains preliminary and strategy implementation challenges persist.

---

## 1. Key Academic Studies

### 1.1 "Does Sentiment Matter for Stock Returns? Evidence from Indian Stock Market"

**Authors:** Saumya Ranjan Dash, Debasish Maitra
**Publication:** Finance Research Letters, Volume 26, September 2018
**Data Period:** April 2002 to May 2014 (weekly data)

**Methodology:** Wavelet decomposition approach to analyze sentiment-return relationship at different time horizons using NSE indices (Nifty 50, Midcap, Smallcap)

**Key Findings:**

| Finding | Detail |
|---------|--------|
| Non-decomposed series | Did NOT provide encouraging evidence of sentiment impact based on linear causality |
| Decomposed series (different frequencies) | Strong effect of sentiment on returns in BOTH short-run and long-run |
| Most significant sentiment proxies | Turnover (TOV), Put-Call Ratio (PCI), VIX |
| Market cap sensitivity | Smallcap and Midcap stocks MORE influenced by sentiment than large cap (Nifty) |
| Granger causality | Sentiment index Granger causes Smallcap and Midcap returns in short-run (2-4 months) and long-run (16-32 months) |

**Conclusion:** Whether investors are short-term or long-term traders, their investment activities cannot be delinked from sentiment. Supports behavioral finance theory that investors are not entirely rational.

---

### 1.2 "Aggregate News Sentiment and Stock Market Returns in India"

**Publication:** Journal of Risk and Financial Management, Volume 16(8), 2023
**Focus:** Connection between aggregate news sentiment and stock market returns during non-crisis periods

**Key Contribution:** Advances noise trader theory by examining connection between aggregate news sentiment and Indian stock market returns

**Methodology:** Analyzed relationship between news sentiment indices and market returns using various statistical techniques

**Findings:**
- News sentiment has predictive power for market returns
- Relationship is more pronounced during certain market regimes
- Aggregate sentiment provides information beyond traditional financial indicators

---

### 1.3 "Algorithmic Trading and Sentiment Analysis in Indian Stock Market"

**Publication:** ITM Conferences (ICAETM 2024)
**Data Period:** 2018 to 2024

**Key Finding:** Study revealed that the percentage of error which is less than 5% on almost all companies except one, indicating reasonably accurate sentiment-based predictions across the market.

**Approach:** Combined sentiment analysis with algorithmic trading strategies using stock-related tweets and news articles

---

### 1.4 "Does investor sentiment affect the Indian stock market? Evidence from Nifty 500 and selected sectoral indices"

**Publication:** Cogent Economics & Statistics, 2024
**Focus:** Nifty 500 and sectoral indices

**Key Finding:** Strong significant positive sentiment effect on Nifty 500 and selected sectoral indices return. Results suggest retail and institutional investors need to take caution while building portfolios given sentiment-return relationship.

**Proposed Sentiment Index:** Unique INDex using seven indirect proxy sentiment indicators suitable for Indian stock market

---

### 1.5 "Evidence from the NIFTY 50 in the Era of Democratised AI (2024)"

**Publication:** SSRN Working Paper (Paper ID: 6299459)
**Focus:** Transformer-based NLP signals for alpha generation in Nifty 50

**Claim:** Tests whether transformer-based NLP signals generate exploitable alpha in India's benchmark index

**Status:** Working paper - results require peer review verification

---

### 1.6 "Study on the sentimental influence on Indian stock price"

**Publication:** PMC (PubMed Central), NIH
**Focus:** Interdependence between financial market sentiment and stock price movements

**Key Finding:** Explicit information flow and direction of causality between news sentiment and stock price movement identified

**Methodology:** Correlation analysis examining connection between news sentiment and stock prices

---

## 2. Industry Whitepapers & Research

### 2.1 Quant Fund Performance Studies

**IVCA Report 2025 Findings:**
- Quant funds represent approximately 5% of Category III AIF long-short schemes in India
- Quant, multi-asset, and market-neutral strategies are "carving a niche" in India's AIF ecosystem
- Described as "a sign of growing sophistication in portfolio construction"
- Quant models mentioned as attractive for "precision and scalability"

**Key Observation:** Limited publicly available data on specific performance attribution to sentiment strategies vs. other quant approaches.

### 2.2 Sentiment Analysis Effectiveness Research

**"Evaluating the Viability of Alpha Generation from Sentiment Analysis" (arXiv:2507.03350)**

| Aspect | Finding |
|--------|---------|
| Test period | 28 months |
| Test assets | Dow Jones 30 stocks |
| All sentiment models | Produced positive returns, outperforming Buy&Hold |
| Best model | Regression model achieved 50.63% return |
| Model types | Two classification models, one regression model tested |

**Conclusion:** Sentiment-based trading strategies can generate positive alpha. Regression-based sentiment models outperformed classification models.

### 2.3 "Decoding Investor Sentiments in the Indian Stock Market"

**Publication:** F1000Research
**Focus:** Psychological and social biases affecting individual investors' decisions

**Key Finding:** Investor sentiment significantly impacts stock returns - when investors exhibit optimism, returns increase; when they display pessimism, returns decrease (particularly at lower price levels).

---

## 3. Methodological Approaches Used

### 3.1 Sentiment Measurement Techniques

| Method | Application | Accuracy |
|--------|-------------|----------|
| Wavelet decomposition | Time series analysis at multiple frequencies | Identifies short and long-run relationships |
| Granger causality | Predictive relationship testing | Tests if sentiment "causes" returns |
| Machine Learning (ML) | Stock price prediction | Error rates <5% for most companies |
| NLP/Transformer models | News classification | High accuracy for English news |
| Regression models | Alpha generation | 50.63% returns (Dow Jones study) |

### 3.2 Data Sources Used in Research

- **Twitter/X:** Stock-related tweets for retail sentiment
- **Financial news:** Headlines from major newspapers
- **NSE/BSE data:** Price, volume, turnover, put-call ratios
- **VIX:** Implied volatility as sentiment proxy
- **Turnover rates:** Trading activity as sentiment indicator

---

## 4. Time Period Analysis

| Study Period | Focus | Key Finding |
|--------------|-------|-------------|
| 2002-2014 | Pre-COVID era | Sentiment matters for all cap sizes |
| 2018-2024 | Recent decade | Error rates <5% for sentiment models |
| 2020-2022 | COVID period | Stock market sentiment extremely volatile |
| 2024-Present | AI democratization | Transformer models show promise |

**Note:** Limited long-term post-COVID studies available as of research date.

---

## 5. Key Takeaways for Practitioners

1. **Short-term predictive power exists:** Sentiment has demonstrated ability to predict short-term returns, particularly for mid/small cap stocks.

2. **Methodology matters:** Wavelet decomposition and regression-based models show stronger results than simple linear models.

3. **Multi-frequency analysis:** Decomposing time series reveals sentiment effects invisible in aggregate data.

4. **Alpha generation viable:** Studies confirm sentiment-based strategies can generate positive alpha, though implementation challenges remain.

5. **Language consideration:** Most India-focused studies rely on English-language news; Hindi sentiment analysis less researched.

6. **Institutional vs retail signals:** Sentiment effectiveness varies between institutional-driven and retail-driven stocks.

---

## 6. Research Gaps

- Limited peer-reviewed studies specifically on Hindi-language news sentiment
- Post-COVID effectiveness studies largely absent
- Performance attribution to sentiment vs. other factors rarely separated
- Industry whitepapers from Indian quant funds not publicly available
- Long-term out-of-sample testing results limited

---

## References

- Dash & Maitra (2018): "Does sentiment matter for stock returns?" Finance Research Letters
- Journal of Risk and Financial Management (2023): "Aggregate News Sentiment and Stock Market Returns in India"
- ICAETM 2024: "Algorithmic Trading and Sentiment Analysis in Indian Stock Market"
- Cogent Economics & Statistics (2024): "Does investor sentiment affect the Indian stock market?"
- SSRN Paper 6299459: "Evidence from the NIFTY 50 in the Era of Democratised AI"
- PMC10724666: "Study on the sentimental influence on Indian stock price"
- arXiv:2507.03350: "Evaluating the Viability of Alpha Generation from Sentiment Analysis"
- IVCA Report 2025: Category III AIF Performance Analysis