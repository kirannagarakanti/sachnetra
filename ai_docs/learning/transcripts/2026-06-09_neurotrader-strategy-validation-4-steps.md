# Transcript — NeuroTrader: "How I Develop & Validate a Trading Strategy (4 steps)"

source_url: https://www.youtube.com/watch?v=NLBXgSmRBgU&t=839s
code repo: https://github.com/neurotrader888/mcpt  (Monte Carlo Permutation Tests)
captured: 2026-06-09
note: verbatim auto-captions pasted by Lijo. Kept as the audit trail for the distillation in
`../videos/2026-06-09_strategy-validation-permutation-tests.md`.

---

[0:00] In this video I'll show the thought process and four steps I always use when developing a new
trading strategy. The approach is generic and compatible with almost every strategy. The four steps are:
(1) in-sample excellence, (2) in-sample Monte Carlo permutation test, (3) walk-forward test, and
(4) walk-forward Monte Carlo permutation test.

[0:28] How I assess a trading strategy, using a moving-average crossover as an example. Load candlestick
data, compute a fast and slow moving average; at each bar check if fast > slow and create a signal
denoting the position (1 = long after that bar, 0 = flat). Regardless of strategy, one should be able to
create a similar signal — a value denoting the position after each bar. Compute close-to-close returns,
shift forward by one bar, multiply position signal by shifted returns to get a per-bar strategy return.
Per-bar returns (not per-trade) are used to compute objective functions like profit factor or Sharpe —
more data, more stable. (Per the book "Testing and Tuning Market Trading Systems.")

[1:32] Scrap the moving-average crossover (lame); use the Donchian channel breakout: go long when current
close is the highest over a look-back, short when it's the lowest. Idea: trade in the direction of range
breakouts to ride trends. Output is a signal vector (+1/-1 per bar). The strategy needs a look-back, so
grid-search a wide variety and pick the best profit factor. On hourly Bitcoin 2016-2019, best look-back =
19, profit factor 1.08.

[2:20] In-sample performance: cumulative sum of log strategy returns = crude backtest. Generic components
of EVERY strategy: an idea, in-sample/development data, and a way to fit/optimize/select the best version.
Whether optimizing a look-back, selecting chart patterns, or training a neural net — this is how
strategies are optimized.

[3:00] Two questions at the development stage: "Is this excellent?" and "Is it obviously overfit?"
In-sample results should be pretty good. If suspiciously good (100% win rate) you're overfitting or have a
future leak. If you suspect overfitting, dial back complexity. Answer to "obviously overfit?" should be
"no" or "not obviously."

[4:18] Once satisfied in-sample: was the excellent performance from real patterns in the data, or just
because the optimization was powerful enough to find something in noise? I.e. is data-mining bias the main
contributor? Optimization always finds a best config with selection bias. A good strategy's in-sample
performance is mostly real patterns; a trash strategy's in-sample performance is ENTIRELY data-mining bias.
Null hypothesis: the strategy is garbage. Use the in-sample Monte Carlo permutation test to disprove it.

[5:08] How the test works: optimized Donchian = profit factor 1.08 on real data. Create a random
permutation of the data → legitimate patterns destroyed, just noise with nearly identical statistical
properties. Optimize on the permuted data → profit factor 1.02. Real beat permuted → small evidence the
null is false. Repeat for many permutations; each time, optimize. If 1.08 (real) beats the vast majority
of permutations, disprove the null.

[6:24 - 9:50] The bar-permutation algorithm (the get_permutation function): works on a single OHLC
dataframe or a list (multi-market). Converts to log prices relative to each bar's open; shuffles the
intra-bar relative quantities and (separately) the gaps; re-strings them into a permutation. First open
and last close are preserved (overall trend kept), but the PATH between is completely different. Resulting
bars have nearly identical mean/std/skew/kurtosis. For multi-market (e.g. BTC + ETH) the correlation is
preserved by permuting together. Caveat: price is NOT a random walk — real prices have volatility
clustering and long memory, which the permutation DESTROYS. If your strategy depends on those properties
the test is optimistically biased — but if it can't pass even with that bias, it's probably overfitting.

[10:18] In-sample permutation test code: load training data, optimize → real profit factor. Loop N
permutations; each: permute bars, optimize, get permuted profit factor; count how often permuted >= real.
p-value = (permutation-was-better count) / N ≈ probability the real result was mainly data-mining bias.
Plot a histogram of permuted profit factors with a line at the real value. 1,000 permutations → only a
couple beat the original → p = 0.3%. Wants p below 1% → pass.

[11:53] Overfit example: fit a decision tree on 3 basic price-difference indicators, target = next-24h
up/down, with min-samples-per-leaf set very low (guaranteed overfit). In-sample backtest looks absurdly
good → "is this obviously overfit?" → yes (looks like a future leak or horrible overfit). Run the in-sample
permutation test → the model does just as good or better on permutations → throw the strategy in the trash.

[13:00] Use as many permutations as possible; 1,000 reasonable minimum, 100 hard minimum. The quasi-p-value
roughly = probability your in-sample results came mainly from data-mining bias. Don't continue if over 1% —
but don't make it a target ("if a measure becomes a target it is no longer a good measure"); fiddle enough
and you can pass anything.

[13:49] Why not just test on 2020 data? Once out-of-sample data is used even once, it's no longer truly
out-of-sample — it becomes a VALIDATION set, and reusing it stacks selection bias. The in-sample
permutation test lets you detect a bad idea BEFORE wasting out-of-sample data or stacking selection bias.

[15:36] Walk-forward: re-optimize periodically (train look-back 4y, re-optimize every 30 days), test on the
unseen next chunk — how the strategy would actually trade. Donchian walk-forward on 2020 → profit factor
1.04 (worse than in-sample, expected — no data-mining bias). "Is this worth trading?" Subjective; he says it
kind of sucks but continues for the video.

[17:14] Walk-forward permutation test: permute the data AFTER the first training fold (start_index = train
window). Walk-forward the same strategy on the permutation → a profit factor a WORTHLESS strategy could
produce. Many permutations → distribution of worthless-strategy results. Real walk-forward should beat the
vast majority. 200 permutations → p = 22% → ~22% chance the 1.04 was dumb luck. He's more lenient here
(accepts ~5% on one year; <1% if 2+ years). Walk-forward MCPT is slow — "the test to start before going to
sleep."

[19:48] Source: book "Permutation and Randomization Tests for Trading System Development" by Timothy Masters
(PhD statistics). Verdict on the Donchian breakout with optimized look-back: did NOT pass the walk-forward
permutation test → would not trade it. Lesson: optimizing indicator look-backs rarely generalizes; better
to find a STABLE look-back region (many values work decently), pick a reasonable one, fix it, then improve
the strategy. He will not trade any strategy that doesn't have very low p-values on BOTH the in-sample and
walk-forward permutation tests.
</content>
</invoke>
