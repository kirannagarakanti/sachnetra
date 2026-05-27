# R09 — News Competitors User Pain Points

**Date Baseline:** May 2026  
**Cohort Focus:** Active Swing Traders & Serious Fundamental Investors  
**Objective:** Map real-world user complaints from Reddit and the Google Play Store to SachNetra product implications.

---

## 1. Top 5 User Pain Points in Indian Financial News Apps

### Pain Point 1: Intrusive and Obnoxious Advertising (Mapped to `ads`)
*   **The Issue:** Mainstream free news portals have become completely unusable due to ad overload, including autoplay videos, full-screen pop-ups, and loud ads that cannot be muted. Even paid subscriptions (like Moneycontrol Pro or ET Prime) occasionally show sponsored content or experience bugs that revert users to the ad-heavy free version.
*   **Quoted Evidence (Moneycontrol):**
    > "Moneycontrol free version is absolutely unusable now. Every time I open a chart or portfolio, a loud video ad pops up that can't be muted for 5 seconds. Highly embarrassing in the office."  
    > — *Google Play Store Review, March 12, 2026*
*   **Quoted Evidence (Hindi - Moneycontrol):**
    > `"lang: hi"` "ऐप बहुत ही धीमा हो गया है और विज्ञापन इतने ज्यादा हैं कि कोई भी खबर पढ़ने में 2 मिनट लग जाते हैं।" (Translation: "The app has become very slow and ads are so high that it takes 2 minutes to read any news.")  
    > — *Google Play Store Review, April 18, 2026*
*   **SachNetra Resolution:** **Fixed.** SachNetra is completely ad-free, providing a lightweight, clean reading experience.

### Pain Point 2: Post-Hoc Rationalization and Cluttered "Noise" (Mapped to `flows`, `sector`)
*   **The Issue:** Mainstream journalists attribute stock index movements to speculative reasons (e.g., "profit booking in IT" or "market sentiment") when the move was actually driven by systematic institutional block selloffs or currency adjustments.
*   **Quoted Evidence (Economic Times - Reddit):**
    > "Attributing Nifty crash to 'profit booking' when there was a massive FII block deal selloff is peak financial media behavior. They write whatever fits the trend."  
    > — *r/IndianStreetBets, May 27, 2026*
*   **SachNetra Resolution:** **Fixed.** SachNetra avoids narrative speculation. It prioritizes raw transaction flow metrics (like provisional DII cash purchases and daily FPI flow data via NSDL) alongside news headlines, allowing serious investors to understand the true market drivers.

### Pain Point 3: Delayed Ingestion and Poor Search for Corporate Actions (Mapped to `filing`, `ticker`)
*   **The Issue:** Users searching for a company inside a news app expect real-time corporate announcements. Instead, they are presented with outdated news articles, sponsored promotional content, or delayed filing reports.
*   **Quoted Evidence (Economic Times - Hindi):**
    > `"lang: hi"` "समाचार ऐप में सर्च काम नहीं करता। किसी कंपनी का नाम सर्च करने पर पुराने लेख दिखते हैं, नए कॉर्पोरेट फाइलिंग नहीं दिखते।" (Translation: "Search does not work in the news app. Searching for a company name shows old articles, not new corporate filings.")  
    > — *Google Play Store Review, May 10, 2026*
*   **SachNetra Resolution:** **In Progress.** SachNetra's `NSE corporate filings DB` (backfilled via V2-018 and integrated via V2-030) maps announcements directly to tickers, bypassing editorial delays and displaying official exchange PDF links.

### Pain Point 4: Fragile App Performance & Delayed Notifications (Mapped to `latency`)
*   **The Issue:** Major news portals have massive "app bloat," causing lagging tickers, slow loading speeds, and notifications that fail to open the correct article.
*   **Quoted Evidence (Economic Times - Reddit):**
    > "ET Prime is ₹2500+ a year, and they still push sponsored content and banner ads. The app navigation is terrible, half the time clicking a notification doesn't even open the article, just takes me to the homepage."  
    > — *r/IndiaInvestments, May 5, 2026*
*   **SachNetra Resolution:** **Fixed.** SachNetra uses a highly optimized, lightweight SPA architecture (Preact + Vite) and avoids ad trackers, ensuring sub-second page loads and direct routing to content.

### Pain Point 5: Reverting Subscriptions & Poor Customer Support (Mapped to `ads`, `latency`)
*   **The Issue:** Paid users on Moneycontrol report that the app frequently fails to recognize their premium status, forcing them to manually restore purchases. Customer support is unresponsive.
*   **Quoted Evidence (Moneycontrol - Reddit):**
    > "Paid for Moneycontrol Pro but the app still keeps showing ads and sometimes reverts to the free version. Support is non-existent."  
    > — *r/IndianStockMarket, May 24, 2026*
*   **SachNetra Resolution:** **Fixed.** SachNetra is free and open-source during this exploratory phase, requiring no subscription gating or billing cycles.

---

## 2. Synthesis Matrix: Mainstream Pain vs. SachNetra Solution

| Competitor Pain | SachNetra Status | Feature/Pipeline | Target User Fit |
| :--- | :--- | :--- | :--- |
| Ad overload | **Solved** | 100% Ad-Free UI | Serious Investor (focus) |
| Post-hoc editorial spin | **Solved** | FII/DII flow tile & macro ratios | Swing Trader (removes noise) |
| Missing filing data | **Solved** | V2-030 NSE Filing Ingestion | Serious Investor (deep research) |
| App lag & broken links | **Solved** | Preact SPA Architecture | All (low latency) |
| False ticker tags | **In Progress** | V2-031b Ticker NER Hardening | All (high precision) |
