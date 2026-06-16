# Transcript — Prop Firm Math Reality (convex payoff / risk geometry)

source_url: https://www.youtube.com/watch?v=BiTqwX-4rNw
captured: 2026-06-07
note: Verbatim auto-caption transcript + author's own summary paragraph + selected viewer
comments (kept because several comments contain the sharpest technical critiques —
trailing drawdown, 0-EV-after-costs, gambler's-ruin invariance).

---

## Author's own summary (from the video description / pinned)

The convex payoff structure of prop firm accounts makes it possible to extract positive
expected value net of challenge and activation fees, if you model the process—end-to-end—as
a structured product. There's obviously not an analytic solution to this optimization, but
Monte Carlo simulation makes it possible to understand the optimal risk geometry for these
accounts, and it allows us to determine the exact probability of passing, and net expected
value, of a given strategy, given a backtest of its trades. This is how to pass a prop firm
account challenge, and extract maximum net EV, even with a 0 (or low) expected value strategy.

---

## Verbatim auto-captions (timestamped)

0:00 If you trade prop firm accounts, this could well be one of the most important videos you
watch about trading in general. Unlike any video you've probably watched about trading — if
you're watching people like TJR or ICT — I'm actually going to break down the verifiable
mathematical reality of trading prop firm accounts.

0:15 There's a very large probability that whatever strategy you're trading — whether you got
that from YouTube, from some guru, or you made it up yourself — there's a very small possibility
that if you're trading the assets tradable on these prop firm accounts (super liquid futures
with tons of eyeballs, HFT arbitrageurs, institutions throwing millions at them every day) that
you actually are trading a strategy that generates alpha. They're some of the best-priced,
most-efficient markets in the world because they're so liquid.

0:49 That said, when you trade a prop firm, it's not imperative that you have a strategy that
generates alpha — or even a strategy that has positive expected value — in order to have positive
net expected value over the entire course of doing a prop firm challenge, getting funded, and
trading the funded accounts.

1:04 (Prop firms as structured products) If you treat prop firm accounts — the challenge and the
funded phase — like a structured product, which is what you should do if you want to model them
correctly and figure out whether you're going to make or lose money before you throw money at
them... don't blindly throw money at these accounts not knowing your exact probability of passing
or the net EV.

1:30 If you're trading some top-tick / bottom-tick, super high RR strategy — very tight stop-loss,
very wide take-profit, low win rate — you're trading pretty much the exact mathematical opposite
of what you should be trading on these accounts to take advantage of the convex payoff structure.

1:46 (Convex payoff) What I mean is that your downside is capped. The losses you take on a prop
firm account challenge are not realized. If you lose $3,000 on your prop account and blow it, you
didn't lose $3,000 actual USD — you lost the sum total of the challenge fees you paid (e.g. a
Topstep 50K account, ~$49 if you passed first try) plus your activation fee. If you win $3,000,
that win is actually realized — you can take a payout. That's a convex payoff structure, like a
call option: loss capped at what you paid, winnings theoretically unlimited and accelerating as
price moves in your favor.

2:36 So it's an optimization problem — making the maximum money in this convex payoff environment
— which we can solve with simulation. We use simulation on toy strategies to get the general
characteristics of the risk geometry we should deploy to maximize chances of passing and making
the most money.

2:59 (Risk geometry) By risk geometry I mean win rate and risk-to-reward — how frequently you win
and how tight your stop-loss is vs your take-profit. Every strategy we look at is a toy strategy
with ZERO expected value per trade — traded over many trades on a real market they'd neither make
nor lose money. We look at low RR with high win rate, increasing to 4R with 20% win rate.

3:43 We use Monte Carlo to simulate equity paths in the barrier problem that is a prop firm
challenge, to figure out what risk geometry works best on strategies that all have equal and zero
expected value.

4:06 (Toy strategy results) 4:1 RR with 20% win rate (like trying to top/bottom-tick) — we pass
37% of the time, fail 63%. 3:1 RR — odds get ~1% better. 2:1 RR / 33% win rate (still zero EV) —
~2% better. 1:1 RR / 50% win rate — increases again. Larger stop than take-profit (still zero EV)
— increases again. Even wider stop / 75% win rate — stays virtually the same. Clear trend: worse
RR (wider stop, tighter take-profit) but higher win rate has a greater chance of passing.

5:13 Could these pairings differ for your strategy? Of course. But most people have a zero or
negative EV strategy if they're trading stuff off YouTube manually (99% of them). The interesting
thing about the convex payoff environment is that doesn't necessarily preclude making money. General
trend: as the standard deviation of trade P&Ls increases, pass rate decreases. High win rate / low
RR (consistent wins, occasional larger loss) is more conducive to passing this barrier problem than
the opposite.

5:55 (Real strategy example) Apply this RR to an opening-range-breakout (ORB) strategy and we
achieve a win rate just like this, with a pass rate matching the simulation (GBM / stochastic jump
diffusion). The ORB I coded has slightly better pass probability because it has slight positive EV
per trade. Now passing ~50% of the time — vs Topstep's own 2024 stat of ~12.4% pass rate. All we
did was code a strategy not even viable in the real world, generating very small positive EV, and
already ~50% chance of passing — 4× better than the average Topstep trader. Built in 20 minutes.

6:57 What if we do a bit better? (Refers to a TikTok/IG clip of passing a Topstep challenge first
try, minimum days.) The strategy traded had over a 90% chance of passing.

7:23 (Modeling the funded phase) More important than pass % is whether we make money once passed.
The strategy with the best odds of passing the challenge is NOT the one that generates the highest
expected payout once funded. We change risk geometry a bit for the funded phase, and average
expected payout per passed account is about $9,000. Does paying $49 mean you make $9,000 each time?
No — ~40% chance of passing, so net EV per account factors in how many challenges to get funded,
the activation fee, and average payout. Pessimistic case: ~$300 on average to get an active funded
account, then ~$8,900 average payout → ~$8,600 net of fees.

8:14 (Takeaways) Now you understand what risk geometry works best, what a convex payoff structure
is, and how to take advantage of it with a strategy that has no (or very small positive) EV to
generate net-of-fees positive EV. Stop paying gurus; learn to code; deploy via the prop firm's API.
You don't need a winning strategy — just exploit the shape of the payoff where losses aren't
realized but winnings are.

8:53 (Plug) QuampPad waitlist; public beta closed; production v2 in ~1.5–2 months.

---

## Selected viewer comments (kept for the technical critiques)

@tomwhyte: "Surely the probability of passing is exactly the same no matter the RR/WR as long as
the expected value is zero. A 1:4 with 20% WR has the same probability of passing as a 0.5RR with
66.66% WR, assuming risk is constant." — [gambler's-ruin invariance objection]

@Ramses-b4f: "Yo you forgot to take the trailing drawdown into account in regards to your
simulations for the pass % of the accounts."

@gtx2083: "The monte carlo does not make sense mainly because of the trailing dd. Trailing DD
destroys the negative RR path."

@mark-u6l4u: "He isn't taking into account that Topstep and pretty much all prop firms use a
trailing stop, not a static stop. When I programmed this myself the pass rate is 23-25%. And he
didn't talk about the endless rules once you have a funded account. I modeled that too and the
average payout was nowhere near the $8900 he said, and neither was the median."

@MaxGausden: "In order to actually have a 0EV you would statistically need a profitable strategy to
account for brokerage, slips etc. If you walk in with a 0EV-per-trade strategy AFTER brokerage and
slippage you will be losing the carnival game. Prop firms are essentially a call option you are
buying at a richly priced strike... The prop account itself will rarely be +EV to the buyer."

@kevinkull2072: "Bro has yet to show a single payout lmao." [199 likes — top critical comment]

@carlosbrambila3489: "To sum it up fellas, lower your R:R and you're more likely to be profitable."

@finetique: (8-yr scalper) "He is telling the truth. Don't run for big wins, run for small ones...
Chase consistency, strict rules, discipline."

@VegasIsTrading: "Influencers play prop firms like a stat sheet — 30-40% win rate, go huge on day
1 of the funded account aiming for 5-10K, then just hit winning days for the consistency rule and
take max payout." [consistency-rule gaming angle]

@danilo_sipala_the: "The real question is whether the risk geometry still holds once execution
drift and regime changes hit."
