---
date: 2026-05-27
playlist: nptel-ts-r
source: synthesis of ep01–ep60 (Prof. Sudeep Bapat, IIT Bombay · NPTEL)
purpose: A friendly, plain-English walkthrough of the whole course — written for Lijo, who copy-pasted transcripts and now wants to actually understand what's in them.
audience: 12-year-old Lijo (i.e. no jargon assumed, story before formula)
status: study-guide
---

# What I Learned — Time Series Modelling and Forecasting with R

> **How to read this.** Top to bottom, in order. Each section is one big idea. I use stories first, then introduce the proper name, then say why it matters for SachNetra. If a section feels obvious, skim. If it feels confusing, slow down — it likely connects to the next one.

---

## 0. Why does this whole field exist?

Most of statistics assumes you have a bunch of **independent samples** — like 100 people picked at random from a city. You can shuffle them, swap them around, average them. Order doesn't matter.

**Time series breaks that assumption.** When you measure a stock price every day, or rainfall every month, or Nifty closes every minute — the order matters. Yesterday's value is connected to today's. Today's connects to tomorrow's. The data has **memory**.

Almost every standard statistics tool (regression, t-tests, "the mean of these numbers") quietly assumes "no memory." If you use them on time-ordered data without thinking, your answers are wrong — sometimes silently, dangerously wrong (we'll see this in §12, "spurious regression").

So this whole field is just: **statistics, but redesigned to handle data where order matters and yesterday remembers today.**

That's it. Everything else is mechanics.

---

## 1. What is a time series, really?

Anything you measure repeatedly over time. Three flavors:

1. **A trend** — the long-term direction. India's population goes up. Glaciers shrink. Nifty has drifted upward for 30 years.
2. **Seasonality** — repeats on a fixed calendar. Ice cream sales every summer. Diwali shopping every October. Quarterly earnings every 3 months.
3. **Noise** — the random wiggle on top.

A real series = trend + seasonality + noise, all stirred together. Your job is to pull them apart so you can study each one. That pulling-apart is called **decomposition** (ep07).

Two flavors of decomposition:
- **Additive** — the pieces add up. (Series = Trend + Season + Noise.) Use when seasonal swings are roughly the same size whether the series is high or low.
- **Multiplicative** — the pieces multiply. (Series = Trend × Season × Noise.) Use when swings get bigger as the trend grows.

> Example: airline passengers grew over decades AND the December peak got bigger every year too → multiplicative. SachNetra filing counts probably additive — an April spike looks the same whether Nifty is 15k or 25k.

---

## 2. The single most important word in the course: **stationarity**

This is the concept the entire course pivots around. Get this and everything after makes sense.

### The puzzle

Imagine you want to study a river. At any moment in time, you only get **one** measurement of its level. You can't go back to January 5th, 2019 and re-measure under different conditions. So how could you ever collect "enough data" to study how the river behaves?

**The trick**: assume the river behaves the same way *regardless of when you look at it*. Then your whole history of one-per-day measurements becomes "lots of samples from the same stable process," and you have enough data to study it.

That assumption is **stationarity**.

### In plain words

A stationary series = the rules don't change over time. Its average stays roughly flat. Its wiggliness stays roughly the same. The way today connects to yesterday is the same way it'll connect to tomorrow.

A non-stationary series = the rules keep changing. India's population (always growing), Delhi air quality (different every season), stock prices (they drift). About 90% of real-world data is non-stationary.

### Why you care

**Almost every model in this course assumes stationarity.** If you skip checking, you'll fit a model on non-stationary data and the model will lie to you. So step 1 of every workflow:

> Is my series stationary? If not, transform it until it is.

The transformation is usually **differencing** — instead of modeling the price, you model the *change* in price (today's price minus yesterday's). That subtraction kills the trend.

### Two flavors of stationarity (ep04–05)

- **Strict (strong) stationarity** — the *full probability shape* of the series is the same no matter when you look. Almost impossible to verify in real data. Mostly a theoretical idea.
- **Weak stationarity** — only requires three things: (1) average doesn't change with time, (2) variance doesn't change with time, (3) the relationship between any two time points depends only on the gap between them, not the absolute date. **This is what real models use.**

### The four ways to test it (ep14)

You don't eyeball it; you run a test. The four big ones:
- **ADF (Augmented Dickey-Fuller)** — the most common. Null: "non-stationary." Reject the null → stationary. (P-value < 0.05 means good news.)
- **KPSS** — the opposite null. Null: "stationary." Don't reject → still good. (Used as a sanity-check beside ADF.)
- **Phillips-Perron (PP)** — more robust version of ADF.
- **Variance Ratio** — tests if a series is a random walk.

> Pro tip from ep14: run ADF *and* KPSS together. If they agree → confident answer. If they disagree → series has tricky structure (likely trend-stationary, not difference-stationary).

---

## 3. The five building-block models (ep08)

Every model in the course is built from these five toys. Learn them once and the rest is variations.

### 3.1 White noise — the empty room

`Y_today = a fresh random number, unrelated to anything`

The simplest possible series. Today is independent of yesterday. No pattern, no memory. Forecast = the mean, period.

**Why it matters**: it's the *target* state for your model's leftovers. After you fit a good model, what's left over (the "residuals") should look like white noise. If there's still a pattern in the residuals, your model missed something.

### 3.2 Random walk — the drunk's stagger

`Y_today = Y_yesterday + a random shock`

The drunkard's walk. Each step starts wherever you ended up last time, then takes a random push in any direction. Stock prices follow this (roughly).

**Two important facts**:
- A random walk is **non-stationary**. Its variance grows with time.
- If you compute *changes* (today minus yesterday), you get back white noise. **Differencing turns a random walk into a stationary series.** This is the trick stock-return analysis uses.

### 3.3 AR(p) — autoregressive: "I echo my past values"

`Y_today = some weight × Y_yesterday + another weight × Y_2_days_ago + ... + a fresh random shock`

You predict today from your own past values. The `p` is how many past days you look back. AR(1) = only yesterday matters. AR(2) = yesterday and the day before. And so on.

**Memory phrase**: "**Where I've been predicts where I'm going.**" Momentum.

**Stationary?** Only if the weights are small enough. For AR(1), the rule is the weight must be between -1 and +1. If it hits +1 exactly, you're back to a random walk. If it goes past +1, the series explodes.

### 3.4 MA(q) — moving average: "I echo my past mistakes"

`Y_today = the mean + a fresh shock + some weight × yesterday's shock + ... + some weight × q-days-ago's shock`

This is the subtle one. AR uses past *values*. MA uses past *surprises* (the errors that came out of nowhere on earlier days, like an unexpected earnings miss). The shock from `q` days ago still ripples into today, then dies.

**Memory phrase**: "**My recent surprises still echo, but only for q days.**" Shock decay.

> ⚠️ Important: despite the name, MA(q) has *nothing to do with* the "rolling 50-day moving average" line on a stock chart. Different concept. Confusing legacy naming.

### 3.5 ARMA(p, q) — the combo

Just AR and MA mashed together. Use both p past values *and* q past errors. This is the workhorse before we add the "I" step.

---

## 4. ARIMA: the workhorse name (ep12)

ARIMA = AR + I + MA. The "I" stands for **Integrated**, which is a fancy word for **differenced**.

The full move:

1. Start with your series (probably non-stationary).
2. Difference it `d` times until it becomes stationary. (Usually d=1 is enough; sometimes d=2.)
3. On the differenced (now stationary) series, fit ARMA(p, q).
4. That whole thing is called **ARIMA(p, d, q)**.

> Mental model: ARIMA = "first make it stationary by subtracting consecutive values, then fit the AR/MA machinery on the result." That's it.

**The Box-Jenkins methodology** (ep12) is the formal name for the workflow:
1. Identify the orders (p, d, q) — use the diagnostic graphs (next section).
2. Estimate the parameters — let the computer fit them.
3. Check residuals — should look like white noise.
4. If yes, forecast. If no, go back to step 1.

This loop is the spine of the whole course. Almost every method in later chapters is some variation of it.

---

## 5. How do you pick p, d, q? — the two magic graphs (ep09, ep10)

You don't guess. You stare at two plots.

### The ACF plot (autocorrelation function)

For every "lag" k (1, 2, 3, 4 days ago...), it asks: "**how correlated is today with k days ago?**" Then plots all those correlations side by side.

- White noise's ACF = one tall bar at lag 0, then flat zero everywhere. (Anything is perfectly correlated with itself; nothing else matters.)
- A random walk's ACF = bars stay high for a long time before slowly decaying.

### The PACF plot (partial autocorrelation function)

Same question, but with a fix. Plain ACF at lag 3 is "polluted" — today and 3-days-ago look correlated partly because today depends on yesterday, yesterday depends on the day before, and the day before depends on 3-days-ago. It's an indirect chain.

PACF *removes the chain* and asks: "**how correlated is today with k days ago, AFTER accounting for all the days in between?**" It isolates the direct channel.

### The model-identification table — memorize this one table

| What ACF does | What PACF does | Model |
|---|---|---|
| **Cuts off** sharply after lag q | Slowly fades away | **MA(q)** |
| Slowly fades away | **Cuts off** sharply after lag p | **AR(p)** |
| Both fade away gradually | Both fade away gradually | **ARMA(p, q)** |
| Both flat at zero | Both flat at zero | White noise — no model possible |

> **"Cuts off"** = bars drop to zero and stay there. **"Fades away" / "Tails off"** = bars shrink gradually but stay nonzero for a while.

That's it. You look at the two plots of your stationary series, match the pattern, read off p and q. Then fit ARIMA(p, d, q).

---

## 6. Seasonality and SARIMA (ep13, ep15)

Real data often has both a yesterday-vs-today relationship *and* a same-month-last-year relationship. Diwali, quarterly filings, daily commute patterns — they repeat on a calendar.

**SARIMA** = ARIMA + a seasonal copy of ARIMA. Notation: `ARIMA(p, d, q) × (P, D, Q)_s` where:
- (p, d, q) handles short-term memory (day-to-day)
- (P, D, Q) handles seasonal memory (e.g. Jan-to-Jan)
- s = the season length (12 for monthly, 4 for quarterly, 7 for daily data with weekly seasonality)

**Deterministic vs stochastic seasonality** (ep14):
- Deterministic = the same December bump, every December, mechanical. Fix it with seasonal dummy variables.
- Stochastic = the seasonal pattern itself drifts and evolves. Needs seasonal differencing (D).

**Cyclicality vs seasonality**: cycles are repeats that *don't* lock to the calendar (e.g. business cycles last 3–7 years, not exactly 5). Seasonality is calendar-locked. Don't confuse them.

---

## 7. Diagnostics — did my model actually work? (ep19, ep20)

After fitting any model, the leftover bits (residuals) should look like white noise. Three things to check:

### 7.1 Are the residuals roughly normally distributed?

- **QQ plot** — visual. If the dots line up on the diagonal, you're good.
- **Jarque-Bera test** / **Shapiro-Wilk test** — formal. Null: "yes, normal." A small p-value means **not** normal (bad).

### 7.2 Are the residuals independent (no leftover pattern)?

- **Ljung-Box test** / **Box-Pierce test** — null: "residuals look like white noise." A small p-value means the model missed something (bad).
- Also useful: plot residual ACF. Should look flat.

### 7.3 Is the residual variance constant, or does it cluster?

- **White's test** / **Breusch-Pagan test** — formal homoscedasticity tests.
- Visual: plot the *squared* residuals. If they cluster (calm-calm-calm-volatile-volatile-calm), that's **volatility clustering** and you need a GARCH model (§13).

**Big rule (ep20)**: even if your ARIMA passes the first two tests, *check the squared residuals.* If they still have structure, the model is incomplete — you've modeled the mean correctly but missed the volatility. That's a GARCH problem, not an ARIMA problem.

---

## 8. How do you pick *which* ARIMA among several candidates? (ep17, ep18)

Often two or three models all fit OK. You need a tiebreaker.

### Information criteria — punish complexity

- **AIC** (Akaike) — score = -2·loglikelihood + 2·(number of parameters). Lower is better.
- **BIC** (Bayesian) — same idea but penalizes extra parameters more harshly. Lower is better.

> **Difference**: BIC is stricter, prefers smaller models. AIC tolerates more parameters if they meaningfully improve fit. For forecasting, AIC is often preferred. For interpretation, BIC.

### How parameters get fitted

- **Method of Moments (MOM)** — match observed sample moments (mean, variance, ACF) to theoretical moments. Quick, less efficient.
- **Maximum Likelihood (MLE)** — find the parameter values that make your observed data most probable. The gold standard.
- **OLS** — works for some AR models.

### Parsimony

"Parsimony" = "use the simplest model that still works." Adding parameters always makes the fit prettier; the question is whether they generalize. AIC/BIC enforce parsimony.

### Other identification helpers

- **ESACF** (Extended Sample ACF) and **MINIC** tables — automated grids that scan many (p, q) combinations and flag the best. In Python: `pmdarima.auto_arima()`. In R: `forecast::auto.arima()`.

---

## 9. Forecasting — finally making predictions (ep22, ep23)

Two different operations that look similar but aren't:

- **In-sample fit** — does my model match the past well? (Tests model fit.)
- **Out-of-sample forecast** — what does my model predict for the future? (Tests usefulness.)

**Minimum MSE forecast**: the best forecast of a future value, in a mean-squared-error sense, is the **conditional expectation** given all past info. (For an AR(1), this is just `φ × today's value`.)

### Forecast accuracy metrics

| Metric | What it does | Watch out for |
|---|---|---|
| **MSE** (mean squared error) | average of (forecast − actual)² | Penalizes big errors heavily |
| **RMSE** | √MSE | Same units as the data |
| **MAE** (mean absolute error) | average of \|forecast − actual\| | Doesn't punish outliers as hard |
| **MAPE** (mean absolute percentage error) | average of \|error / actual\| × 100% | Breaks if actuals are near zero |
| **Theil's U** | your model's MSE ÷ naive forecast's MSE | U < 1 = you beat the naive baseline; U ≥ 1 = your model is worse than just guessing "tomorrow = today" |

> **Sanity discipline**: Theil's U is the one to internalize. Any model you build should beat the naive baseline. If it doesn't, you've added complexity without value.

### Prediction intervals

Don't just give a point forecast. Give a range. "Tomorrow's value will be 102 ± 4 with 95% confidence." The further out you forecast, the wider the band gets (forecast error variance grows with horizon).

---

## 10. Smoothing — the simpler cousins of ARIMA (ep24, ep25)

Sometimes you don't need full ARIMA. Just smooth.

### Simple Moving Average (SMA)

Average the last n values. Forecast = that average. Every point in the window gets equal weight. Easy, dumb, sometimes good enough.

### Exponential Moving Average (EMA)

Same idea but recent values get more weight than old ones. Controlled by a parameter `α` (alpha, between 0 and 1):
- α close to 1 = react fast to recent changes (forgetful)
- α close to 0 = react slow, very smooth (long memory)

### Holt's method (double exponential smoothing)

EMA + a separate smoother for the trend. Two parameters: α (level) and β (trend). Use when there's a clear upward/downward direction.

### Holt-Winters (triple exponential smoothing)

Holt + a third smoother for seasonality. Three parameters: α, β, γ. Two flavors:
- **Additive** Holt-Winters — constant-sized seasonal swings
- **Multiplicative** Holt-Winters — seasonal swings scale with trend

Used industrially everywhere — retail forecasting, electricity demand, etc.

**When to use smoothing vs ARIMA**: smoothing is faster, more robust, less interpretable. ARIMA gives you statistical inference and forecasting intervals. Use smoothing as a baseline (something for ARIMA to beat).

---

## 11. Long-memory processes — when ACF refuses to die (ep27–ep31)

Sometimes the autocorrelation at lag 100 is still meaningfully nonzero. ARIMA can't handle that — it implicitly assumes correlations decay *fast* (exponentially). Some series decay *slow* (hyperbolically). They have **long memory**.

### Hurst Exponent (H) — one number that tells you the regime (ep29)

H is between 0 and 1.

| H value | What it means | Trading style |
|---|---|---|
| H = 0.5 | Random walk. No memory. Tomorrow is a coin flip. | Don't trade momentum or mean reversion |
| 0.5 < H < 1.0 | Persistent. Trending. If it went up yesterday, more likely up today. | Momentum |
| 0 < H < 0.5 | Anti-persistent. Mean-reverting. Up today → down tomorrow. | Mean reversion / pair trading |

Originally invented by a British hydrologist (Harold Hurst) trying to design the right size for a Nile River dam.

How to estimate: **R/S analysis** (Rescaled Range). Walk through the data in chunks of different sizes, compute a scaled range for each, and the log-log slope of (chunk size) vs (scaled range) is H.

### ARFIMA — ARIMA with a fractional d (ep28)

In regular ARIMA, d is an integer (you difference 0, 1, or 2 times). In ARFIMA, d can be a *fraction* like 0.3 or -0.2. That fractional differencing is the right tool for long-memory series.

Relationship: **H = d + 0.5**. So if you know H, you know d, and vice versa.

### GPH estimator (ep30)

A different way to estimate d, using frequency-domain math (§14). Don't memorize the math; just know that the GPH regression in the **log-periodogram** gives you d directly.

> **For SachNetra**: if volatility clusters seem to persist for hundreds of days (not 5–10), ARFIMA may fit better than ARIMA. Worth testing on long return series.

---

## 12. Multiple series at once — multivariate (ep32–ep36)

Until now: one series. Real life: many series interacting (Nifty + INR + crude + bonds).

### Cross-correlation function (CCF)

ACF asks "how does today's value relate to my own past?" CCF asks "how does today's series A relate to series B's past (or future)?" If you find that A leads B by 3 days, that's a tradable insight.

> **For SachNetra**: this is the natural tool for testing whether filings lead price moves, whether news sentiment leads volatility, etc. Lead-lag analysis = CCF.

### VAR (Vector Autoregression)

The AR model generalized to multiple series at once. Each series is regressed on past values of *itself and every other series in the system*. Standard tool for macro forecasting.

### VMA, VARMA

Multivariate cousins of MA and ARMA. Used less often than VAR.

---

## 13. Cointegration — the invisible rubber band between two stocks (ep37–ep41)

This is the trick that makes pair trading work, and it's a beautiful idea.

### The puzzle: spurious regression

Take two completely unrelated random walks (e.g. ice cream sales and Virat Kohli's runs). Run a regression. **Statistics will lie to you** — it'll say they're significantly correlated with a great R², when in reality they have nothing to do with each other. The problem: standard regression assumes independent samples, and random walks violate that.

So: never regress one non-stationary series on another without checking. The result is almost always fake.

### The escape: cointegration

But sometimes two random walks share a *common underlying random trend*. Example: HDFC Bank and ICICI Bank both wander, but they're driven by the same banking sector engine. Their *difference* (or some weighted combination of them) doesn't wander — it stays in a tight, stationary band. The rubber band between them is real.

When that happens, the two are **cointegrated**. The weights that produce the stationary combination are the **cointegration vector**. The stationary combination itself is the **long-run equilibrium**.

### How you trade it

If the rubber band stretches too far (HDFC up a lot, ICICI flat), you bet on convergence — short HDFC, long ICICI, wait for the band to snap back. This is **pair trading**.

### The Error Correction Model (ECM) — ep38

A model that *combines* the long-run equilibrium with short-run dynamics. The **speed of adjustment** parameter tells you how fast the rubber band pulls the pair back together.

### Tests for cointegration (ep39)

Five main ones, depending on your situation:
- **Engle-Granger two-step** — the simplest. Run OLS, then ADF the residuals.
- **Johansen test** — works for >2 series simultaneously. The standard for VECM modeling.
- **ARDL bounds test** — works even when some series are stationary and others aren't (mixed orders of integration). Pesaran-Shin-Smith. Useful for macro stuff.

### Causality tests (ep40)

- **Granger causality** — "do past values of X help predict Y, after accounting for Y's own past?" Note: this is statistical lead-lag, NOT real causation.
- **Haugh-Pierce** — tests independence between two series.
- **Hsiao's procedure** — automated Granger search via AIC.

---

## 14. The frequency domain — looking at cycles, not days (ep42–ep45)

Until now: x-axis = time. Now: x-axis = *frequency*.

### The idea (Fourier)

Any wavy signal can be rewritten as a sum of pure sine waves at different frequencies. **Time domain** = "value at each day." **Frequency domain** = "amplitude of each cyclic wavelength."

A pure sine wave with a 12-month period becomes one spike on the frequency plot. White noise becomes a flat plot (all frequencies equal energy — that's literally why it's called "white" noise). A trend becomes a giant spike at frequency zero.

### Spectral density function

The math object that tells you "how much energy does this series have at each frequency?" Computed via the Fourier transform.

The **Wiener-Khinchin theorem** says: spectral density and autocovariance contain the same information, just expressed differently. You can convert between them.

### Periodogram — the practical estimator

A noisy estimate of the spectral density from real data. Spikes in the periodogram = dominant cycles. Practitioners smooth it (Daniell window, Welch's method) to reduce the noise.

### What it's useful for

- Detect hidden cycles you couldn't see in the time plot
- Distinguish white noise (flat spectrum) from random walk (huge spike at low frequencies)
- Long-memory diagnosis via the spectrum's low-frequency tail (links back to GPH estimator)

> **For SachNetra**: probably overkill until we have a specific cycle to look for (e.g. quarterly filing seasonality). Park unless a use case demands it.

---

## 15. Volatility — when the size of moves matters, not the direction (ep46–ep50)

ARIMA models the *mean*. But in finance, the *variance* (volatility) is what risk managers care about. And volatility famously **clusters** — calm days follow calm days, wild days follow wild days. ARIMA doesn't capture this.

### Stylized facts of returns (ep46)

Empirically true for almost every market:
1. Returns themselves are nearly uncorrelated (no easy directional prediction).
2. *Squared* returns are *strongly* correlated (today's volatility predicts tomorrow's).
3. Returns have fat tails (extreme moves happen way more often than a normal distribution predicts).
4. Volatility is asymmetric: bad news increases vol more than equally-sized good news does ("leverage effect").

### ARCH (ep47)

Robert Engle's 1982 invention (Nobel 2003).

`Today's variance = baseline + α × yesterday's squared shock + α₂ × 2-days-ago's squared shock + ...`

The variance itself follows an AR-style process. The bigger the recent shocks, the higher today's volatility.

### The ARCH-LM test (ep48)

Before you fit a GARCH, you have to prove ARCH effects exist. Engle's test:
1. Fit an ARIMA, get residuals.
2. Square them.
3. Regress squared residuals on their lags. If the regression is significant, ARCH effects are present.
4. Test statistic: `T × R²` follows χ² distribution.

If the test rejects → fit GARCH. If not → ARIMA is enough.

### GARCH (ep48)

Tim Bollerslev's 1986 generalization. ARMA-for-variance.

`Today's variance = ω + α × yesterday's squared shock + β × yesterday's variance`

The **GARCH(1,1)** is the workhorse — works on 95% of financial series. Three parameters:
- ω = baseline
- α = how reactive (how much yesterday's shock moves today)
- β = how persistent (how much yesterday's volatility carries over)

**Mean reversion in volatility**: if α + β < 1, the volatility eventually pulls back to a long-run average. If α + β = 1, it's "integrated GARCH" (IGARCH) — shocks last forever.

### GARCH variants (ep49)

- **GJR-GARCH** — adds asymmetry. Bad shocks increase volatility more than good shocks. (Models leverage effect.)
- **EGARCH** — exponential GARCH. Models log of variance, allowing it to handle asymmetry differently.
- **FIGARCH** — fractional integration in GARCH (long-memory volatility).
- **DCC-GARCH** — Dynamic Conditional Correlation, for multivariate volatility (how do two assets' vols co-move?).
- **GARCH-X** — let other variables (e.g. trading volume) enter the variance equation.

> **For SachNetra**: this is the family Exp 7 / Exp 9 used. The pipeline already validated GARCH-based estimation; the takeaway from these episodes is that GJR-GARCH and EGARCH may matter once we look at asymmetric reactions to filing events.

---

## 16. Non-linear time series — when reality has switches (ep51–ep55)

Linear models assume the rules don't change. Reality often has **regimes**: calm/wild markets, bull/bear, expansion/recession. Different rules in different regimes.

### Threshold models (TAR, SETAR)

The model has a "switch" that flips when a variable crosses a threshold. E.g. AR(1) with one set of weights when the past return > 0, and a different set when < 0. Abrupt switching.

### Smooth transition (STAR, LSTAR, ESTAR)

Same idea but the switch is gradual, not abrupt. A logistic function (LSTAR) or exponential function (ESTAR) determines how much weight each regime gets.

### Markov switching (MS-AR) (ep54)

The regime itself is a **hidden state**. You don't observe whether it's "bull" or "bear" — you infer it. The states evolve as a Markov chain (matrix of transition probabilities).

Estimation: **Hamilton filter** / **Kim filter**. Forward-backward algorithm to infer the most likely state path given observed data.

> **For SachNetra**: very interesting for capturing market-state-conditional behavior of news signals. Pursue once basic infrastructure is solid.

---

## 17. Machine learning for time series (ep56–ep60)

The final week. Modern ML tries to handle time series without committing to a specific parametric form.

### Feature engineering trick

Turn a time series into a regression problem by creating **lag features**: column 1 = Y, column 2 = Y at t-1, column 3 = Y at t-2, .... Now any standard ML model (random forest, SVR, kNN, neural net) can predict the next Y from past Y's.

### Models covered

- **Linear regression on lags** — the simplest. Equivalent to an AR model.
- **SVR (Support Vector Regression)** — non-linear via RBF kernel. Good for smooth non-linearities.
- **Random Forest** — handles non-linearities but **cannot extrapolate beyond the range of training data**. Critical limitation for trending series.
- **kNN** — find the k most similar past windows, average their outcomes. Pattern-matching the chart history.
- **Naive Bayes** — for classification (regime up vs down).
- **Neural nets / NNAR(p, k)** — single-hidden-layer NN with p lag inputs and k hidden units. Hybrid ARIMA-NN models often beat either alone.

### Critical warning (ep57)

ML models that don't extrapolate (RF, kNN) will fail on series with trends. You either need to detrend first or use models that can extrapolate (linear/NN).

> **For SachNetra**: the hybrid ARIMA-LSTM approach is a known winner for residual modeling. Worth testing eventually. But basic ARIMA + GARCH should be exhausted first.

---

## 18. The unified workflow — what the whole course boils down to

If you remember nothing else, remember this diagnostic pipeline:

```
1. Plot your series. Look at it.
2. Decompose: any obvious trend/seasonality? (ep07)
3. Test stationarity. (ADF + KPSS — ep14)
   ├── If stationary → continue
   └── If not → difference once (d=1), test again.
4. Look at ACF and PACF of the (now stationary) series.
   ├── Read the model-ID table → pick p, q (ep09)
   └── Detect seasonality → use SARIMA (ep15)
5. Try multiple ARIMA orders, pick the lowest AIC/BIC (ep17–18)
6. Estimate parameters (MLE) → fit the model
7. Diagnostics on residuals:
   ├── Normal? (Jarque-Bera, Shapiro-Wilk — ep19)
   ├── Independent? (Ljung-Box — ep19)
   └── Constant variance?
       ├── Yes → done
       └── No → ARIMA-GARCH: fit GARCH on residuals (ep48)
8. Forecast & compare to baseline (Theil's U vs naive — ep23)
9. If still missing something → try regime models, ML, or
   long-memory ARFIMA (ep27–28, ep51–60)
```

That's the whole 30-hour course in one flowchart.

---

## 19. What this means for SachNetra (the only section that actually matters)

Most of this course is plumbing. The bits that actually change something for our work:

### A. The diagnostic pipeline is generic and reusable

Before any returns/event-window experiment, run ADF + KPSS for stationarity, then Ljung-Box on residuals, then squared-residual Ljung-Box for GARCH effects. This is plug-and-play discipline, not a research bet.

### B. The ACF/PACF question on event windows is testable today

For our NSE filing event studies, plotting ACF of the post-event abnormal returns directly answers: **does the event impact die in 1 day, 2 days, or 5+ days?** That tells us whether to use a 1-day or multi-day window. Cheap, fast, actually informative — flagged across ep04, ep08, ep09.

### C. Pair trading via cointegration is a known viable strategy

The HDFC/ICICI example is the canonical setup. We have the data (research_prices). Engle-Granger or Johansen test → identify cointegrated pairs → trade the band. This is a well-trodden path; if we want it, it's *engineering*, not research.

### D. GARCH-and-friends already validated

Exp 7 and Exp 9 used GARCH-controlled tests to kill the FII directional signal. The course confirms that's the right family. The extensions (GJR, EGARCH) are worth trying *only* if we find an asymmetric reaction (e.g. bad filings produce bigger vol bumps than good ones).

### E. Hurst exponent regime detection is cheap to test

If H tells us when Nifty is in a trending regime vs. mean-reverting regime, that might gate when to deploy momentum vs. pair-trade strategies. One number, easy to compute. Worth a quick experiment.

### F. The ML stuff is premature

Don't go straight to LSTM. ARIMA + GARCH is the baseline. ML approaches are residual-modeling layers on top. Standard parsimony: prove the simple thing first.

### G. R practical sessions can be safely skipped

Our research layer is Node `.mjs` (see `scripts/research/` — Exp 1–10 and the price backfills all run in Node). The R sessions are skill, not concept; equivalents exist either in Node (e.g. `arch.js`, hand-rolled GARCH like Exp 7/9) or as a Python sidecar (`statsmodels`, `arch`, `pmdarima`, `linearmodels`) if a specific method has no Node analogue. Don't migrate the research layer to R; pick the host language per-experiment.

---

## 20. The single sentence

> **Time series = statistics where order matters. Almost all of it is variations on: "make it stationary, fit AR/MA on the remainder, check the leftovers look like white noise, and if they don't, model the volatility separately."**

Everything else is decorations on that one idea.

---

## Open questions to keep nagging at

- Does post-filing return series for our top 3 categories actually have AR or MA structure? (ACF/PACF diagnostic — ep09)
- Is the volatility around filing events asymmetric? (ep49 — would justify GJR-GARCH)
- Are there cointegrated NSE pairs we haven't tested? (ep37–39)
- Does Hurst exponent of Nifty change regime detectably over time? (ep29 — rolling-H experiment)
- Is the ARIMA-LSTM hybrid worth building once basics are exhausted? (ep56, ep59)

These are real, fundable experiment ideas — each maps to a slot in the experiment program (`sachnetra_research_playbook.md`).

---

## What this file is NOT

- Not a substitute for the episode notes. The episode notes have the math.
- Not a SachNetra decision. Verdicts (pursue/park/kill) live in the per-episode notes and the cumulative impact section of `_index.md`.
- Not gospel. If you re-watch an episode and disagree with what's here, **edit this file.** It exists to be argued with.

---

*Compiled 2026-05-27 from the 58 distilled episode notes in this folder. Two episodes (ep06, ep11) were the R-only practical sessions and were skipped. If a future episode is re-watched and adds a concept not captured above, add a row to the relevant section here.*
