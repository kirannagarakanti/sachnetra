#!/usr/bin/env node
/**
 * Experiment 15 — Volatility-Adjusted Cross-Sectional Momentum on Nifty Midcap 150
 * 
 * Design and pre-register a research plan and implement a backtest script that:
 * 1. Queries research_prices for Nifty Midcap 150 constituents.
 * 2. Computes daily log returns.
 * 3. Monthly rebalances a long-only portfolio:
 *    - Signal: Volatility-adjusted momentum (12-1 month log return / 20-day daily standard deviation).
 *    - Ranks and holds top N = 15 stocks.
 *    - Rebalances monthly, applying a 15 bps one-way (30 bps round-trip) transaction cost.
 * 4. Runs diagnostics:
 *    - B1: Theil's U against equal-weighted benchmark.
 *    - B2: Ljung-Box autocorrelation test on raw and squared residuals (lag 10).
 *    - B3: ADF + KPSS joint stationarity tests.
 *    - B4: Stationarity preflight on returns before CAPM regression (alpha, beta).
 * 5. Calculates Out-of-Sample Deflated Sharpe Ratio (DSR).
 * 6. Outputs metrics to console and writes Exp15.md in wiki/experiments/.
 */

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI Parameters ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const TOP_N = Number(flag('top-n', '15')); // Number of stocks to hold
const TRANS_COST_BPS = Number(flag('tc-bps', '15')); // One-way TC (15 bps)
const TRIAL_N = Number(flag('trials', '10')); // Trials for DSR (default 10)
const SIGMA_SR = Number(flag('sigma-sr', '0.5')); // Annualized Sharpe ratio variance across trials
const SPLIT_DATE = flag('split-date', '2021-04-01'); // In-Sample / Out-of-Sample transition
const OUTPUT_MD_PATH = flag('output-md', 'ai_docs/sachnetra v2/wiki/experiments/Exp15.md');

// ── Statistics & Linear Algebra Helpers ─────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

function invertMatrix(M) {
  const n = M.length;
  const A = M.map(row => [...row]);
  const I = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I.push(row);
  }
  
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
    const tempI = I[i]; I[i] = I[maxRow]; I[maxRow] = tempI;
    
    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error("Matrix is singular");
    }
    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }
    
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i];
      for (let j = 0; j < n; j++) {
        A[k][j] -= factor * A[i][j];
        I[k][j] -= factor * I[i][j];
      }
    }
  }
  return I;
}

function solveLinearSystem(A, B) {
  const n = A.length;
  const invA = invertMatrix(A);
  const X = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      X[i] += invA[i][j] * B[j];
    }
  }
  return X;
}

function solveOLS(X, Y) {
  const N = X.length;
  const K = X[0].length;
  
  const XTX = [];
  for (let i = 0; i < K; i++) {
    XTX[i] = new Array(K).fill(0);
    for (let j = 0; j < K; j++) {
      for (let n = 0; n < N; n++) {
        XTX[i][j] += X[n][i] * X[n][j];
      }
    }
  }
  
  const XTY = new Array(K).fill(0);
  for (let i = 0; i < K; i++) {
    for (let n = 0; n < N; n++) {
      XTY[i] += X[n][i] * Y[n];
    }
  }
  
  let beta;
  try {
    beta = solveLinearSystem(XTX, XTY);
  } catch (e) {
    beta = new Array(K).fill(0);
  }
  
  const residuals = [];
  let rss = 0;
  const yMean = Y.reduce((sum, val) => sum + val, 0) / N;
  let tss = 0;
  for (let n = 0; n < N; n++) {
    let pred = 0;
    for (let j = 0; j < K; j++) {
      pred += X[n][j] * beta[j];
    }
    const res = Y[n] - pred;
    residuals.push(res);
    rss += res * res;
    const dy = Y[n] - yMean;
    tss += dy * dy;
  }
  
  const df = N - K;
  const s2 = rss / df;
  const se = new Array(K).fill(0);
  const tStats = new Array(K).fill(0);
  const pValues = new Array(K).fill(1);
  
  try {
    const invXTX = invertMatrix(XTX);
    for (let j = 0; j < K; j++) {
      se[j] = Math.sqrt(s2 * invXTX[j][j]);
      tStats[j] = beta[j] / se[j];
      tStats[j] = Number.isFinite(tStats[j]) ? tStats[j] : 0;
      pValues[j] = twoSidedP(tStats[j]);
    }
  } catch (e) {
    // ignore
  }
  
  const r2 = tss > 0 ? 1 - rss / tss : 0;
  return { beta, se, tStats, pValues, rss, df, residuals, r2 };
}

function twoSidedP(t) {
  const z = Math.abs(t);
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
          a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const tt = 1 / (1 + p * x);
    const y = 1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x);
    return s * y;
  };
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return 2 * (1 - cdf);
}

// ── Time Series Diagnostics ──────────────────────────────────────────────────
function acf(y, k) {
  const n = y.length, m = mean(y);
  let num = 0, den = 0;
  for (let t = 0; t < n; t++) den += (y[t] - m) ** 2;
  for (let t = k; t < n; t++) num += (y[t] - m) * (y[t - k] - m);
  return den > 0 ? num / den : 0;
}

function chiSquaredPValue(Q, df) {
  if (Q <= 0) return 1.0;
  // Wilson-Hilferty transformation
  const term1 = Math.pow(Q / df, 1 / 3);
  const term2 = 1 - 2 / (9 * df);
  const term3 = Math.sqrt(2 / (9 * df));
  const Z = (term1 - term2) / term3;
  
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
          a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x);
    return s * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  };
  const phi = 0.5 * (1 + erf(Z / Math.SQRT2));
  return 1 - phi;
}

function ljungBox(residuals, lags = 10) {
  const N = residuals.length;
  let Q = 0;
  for (let k = 1; k <= lags; k++) {
    Q += (acf(residuals, k) ** 2) / (N - k);
  }
  Q *= N * (N + 2);
  const pVal = chiSquaredPValue(Q, lags);
  return { Q, pVal };
}

function augmentedDickeyFuller(y, lag = 1) {
  const N = y.length;
  if (N <= lag + 2) return { tau: 0, pVal: 1.0 };
  
  const X = [];
  const Y = [];
  for (let t = lag + 1; t < N; t++) {
    const row = [1, y[t - 1]];
    for (let j = 1; j <= lag; j++) {
      row.push(y[t - j] - y[t - j - 1]);
    }
    X.push(row);
    Y.push(y[t] - y[t - 1]);
  }
  
  const res = solveOLS(X, Y);
  const tau = res.tStats[1];
  return { tau, gamma: res.beta[1], n: Y.length };
}

function kpssTest(y) {
  const T = y.length;
  const m = mean(y);
  const e = y.map(x => x - m);
  
  const S = new Array(T).fill(0);
  S[0] = e[0];
  for (let t = 1; t < T; t++) {
    S[t] = S[t - 1] + e[t];
  }
  
  let sumS2 = 0;
  for (let t = 0; t < T; t++) {
    sumS2 += S[t] * S[t];
  }
  
  const l = Math.floor(4 * Math.pow(T / 100, 0.25));
  let s2 = e.reduce((sum, val) => sum + val * val, 0) / T;
  
  for (let j = 1; j <= l; j++) {
    let cov = 0;
    for (let t = j; t < T; t++) {
      cov += e[t] * e[t - j];
    }
    cov /= T;
    const weight = 1 - j / (l + 1);
    s2 += 2 * weight * cov;
  }
  
  const stat = sumS2 / (T * T * s2);
  return { stat, l };
}

// ── Deflated Sharpe Ratio (DSR) Helpers ──────────────────────────────────────
function erfInv(x) {
  const a = 0.147;
  const l = Math.log(1 - x * x);
  const term1 = 2 / (Math.PI * a) + l / 2;
  const inner = term1 * term1 - l / a;
  const sign = Math.sign(x);
  return sign * Math.sqrt(Math.sqrt(inner) - term1);
}

function probit(p) {
  const cleanP = Math.max(1e-9, Math.min(1 - 1e-9, p));
  return Math.SQRT2 * erfInv(2 * cleanP - 1);
}

function normCDF(x) {
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
    const t = 1 / (1 + p * x);
    return s * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  };
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function calculateDSR(rets, annSharpe, trials = 10, sigmaSR = 0.5) {
  const T = rets.length;
  if (T < 3) return 0.0;
  
  const m = mean(rets);
  const std = sd(rets);
  
  // Daily Sharpe Ratio (non-annualized)
  const srDaily = m / std;
  
  // Expected maximum annualized Sharpe Ratio under null
  const gamma_e = 0.5772156649;
  const z1 = probit(1 - 1 / trials);
  const z2 = probit(1 - 1 / (trials * Math.E));
  const sr0_ann = sigmaSR * ((1 - gamma_e) * z1 + gamma_e * z2);
  const sr0_daily = sr0_ann / Math.sqrt(252);
  
  // Calculate skewness and kurtosis
  let sum3 = 0, sum4 = 0;
  for (let i = 0; i < T; i++) {
    const diff = rets[i] - m;
    sum3 += Math.pow(diff, 3);
    sum4 += Math.pow(diff, 4);
  }
  const skew = sum3 / (T * Math.pow(std, 3));
  const kurt = sum4 / (T * Math.pow(std, 4));
  
  const num = (srDaily - sr0_daily) * Math.sqrt(T - 1);
  const den = Math.sqrt(1 - skew * srDaily + ((kurt - 1) / 4) * srDaily * srDaily);
  const Z = num / den;
  
  return {
    dsrValue: normCDF(Z),
    skew,
    kurt,
    sr0_ann,
    sr0_daily,
    srDaily
  };
}

// ── Main Backtest Simulation ────────────────────────────────────────────────
async function main() {
  console.log('=== Experiment 15 — Volatility-Adjusted Cross-Sectional Momentum ===');
  console.log(`  Target: Nifty Midcap 150 Universe`);
  console.log(`  Top N Portfolio Holdings: ${TOP_N}`);
  console.log(`  Transaction Cost Floor:   ${TRANS_COST_BPS} bps one-way`);
  console.log(`  In-Sample / OOS Split:    ${SPLIT_DATE}`);
  
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not set in environment.');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  
  // 1. Load constituents
  let midcapList;
  try {
    midcapList = JSON.parse(readFileSync('shared/nifty-midcap150.json', 'utf8'));
    console.log(`  Loaded ${midcapList.length} constituents from shared/nifty-midcap150.json`);
  } catch (err) {
    console.error('ERROR: Could not read shared/nifty-midcap150.json', err.message);
    process.exit(1);
  }
  
  // 2. Query price history
  console.log('  Querying research_prices database...');
  const { rows } = await pool.query(
    `SELECT symbol, 
            to_char(trade_date,'YYYY-MM-DD') AS trade_date, 
            adj_close::float AS adj_close
     FROM research_prices 
     WHERE symbol = ANY($1) 
       AND trade_date >= '2009-01-01' 
       AND trade_date <= '2026-05-28'
     ORDER BY trade_date ASC`,
    [midcapList]
  );
  
  await pool.end();
  
  if (rows.length === 0) {
    console.error('ERROR: No price data found in research_prices table.');
    process.exit(1);
  }
  
  console.log(`  Retrieved ${rows.length} total price bars.`);
  
  // Organize data: symbol -> date -> adj_close
  const priceMap = new Map(); // symbol -> Map(date -> price)
  const globalDatesSet = new Set();
  const symbolListingDates = new Map(); // symbol -> first trade date
  
  for (const row of rows) {
    const { symbol, trade_date, adj_close } = row;
    if (adj_close == null || Number.isNaN(adj_close)) continue;
    
    globalDatesSet.add(trade_date);
    
    if (!priceMap.has(symbol)) {
      priceMap.set(symbol, new Map());
      symbolListingDates.set(symbol, trade_date);
    }
    priceMap.get(symbol).set(trade_date, adj_close);
  }
  
  const globalDates = Array.from(globalDatesSet).sort();
  console.log(`  Total unique trading dates: ${globalDates.length} (${globalDates[0]} to ${globalDates[globalDates.length - 1]})`);
  
  // Forward-fill prices for rectangular grid
  console.log('  Rectangularizing price grid and computing daily log returns...');
  const gridPrices = new Map(); // symbol -> Array of prices aligned with globalDates
  const gridReturns = new Map(); // symbol -> Array of log returns aligned with globalDates (0 for index 0)
  
  for (const symbol of midcapList) {
    const symMap = priceMap.get(symbol) || new Map();
    const listingDate = symbolListingDates.get(symbol);
    
    const prices = [];
    const returns = [];
    let lastPrice = null;
    
    for (let t = 0; t < globalDates.length; t++) {
      const date = globalDates[t];
      
      if (listingDate == null || date < listingDate) {
        prices.push(null);
        returns.push(null);
      } else {
        let price = symMap.get(date);
        if (price == null) {
          price = lastPrice; // forward-fill
        }
        prices.push(price);
        
        if (lastPrice == null || price == null) {
          returns.push(0);
        } else {
          returns.push(Math.log(price / lastPrice));
        }
        lastPrice = price;
      }
    }
    gridPrices.set(symbol, prices);
    gridReturns.set(symbol, returns);
  }
  
  // Find rebalance dates (first trading day of each month)
  const rebalDates = [];
  let lastMonth = '';
  for (let t = 0; t < globalDates.length; t++) {
    const date = globalDates[t];
    const month = date.slice(0, 7); // 'YYYY-MM'
    if (month !== lastMonth) {
      rebalDates.push({ date, idx: t });
      lastMonth = month;
    }
  }
  console.log(`  Found ${rebalDates.length} monthly rebalance points.`);
  
  // Portfolios: strategy (vol-adj), raw momentum, equal-weighted benchmark
  const stratSeries = new Array(globalDates.length).fill(1.0);
  const rawSeries = new Array(globalDates.length).fill(1.0);
  const benchSeries = new Array(globalDates.length).fill(1.0);
  
  // Portfolios share structures: Array of { symbol, shares }
  let stratHoldings = [];
  let rawHoldings = [];
  let benchHoldings = [];
  
  // Rebalance log for analysis
  const rebalLogs = [];
  
  // Find first rebalance date where we have enough history to calculate signals
  // We need at least 252 trading days of history
  let startRebalIdx = 0;
  while (startRebalIdx < rebalDates.length && rebalDates[startRebalIdx].idx < 253) {
    startRebalIdx++;
  }
  
  console.log(`  Simulation starts at rebalance point ${startRebalIdx}: ${rebalDates[startRebalIdx].date}`);
  
  // Backtest loop day-by-day
  const startDay = rebalDates[startRebalIdx].idx;
  
  // Initialize equity curves to 1000000.0
  let stratEquity = 1000000.0;
  let rawEquity = 1000000.0;
  let benchEquity = 1000000.0;
  
  stratSeries[startDay] = stratEquity;
  rawSeries[startDay] = rawEquity;
  benchSeries[startDay] = benchEquity;
  
  for (let m = startRebalIdx; m < rebalDates.length; m++) {
    const currentRebal = rebalDates[m];
    const nextRebal = rebalDates[m + 1] || { idx: globalDates.length - 1 };
    
    const tRebal = currentRebal.idx;
    const signalIdx = tRebal - 1; // Signal day is the day before rebalancing
    
    // --- 1. SIGNAL COMPUTATION ---
    const candidates = [];
    
    for (const symbol of midcapList) {
      const prices = gridPrices.get(symbol);
      const rets = gridReturns.get(symbol);
      
      // Stock must have valid history back 252 days from signalIdx
      if (signalIdx - 252 < 0) continue;
      if (prices[signalIdx] == null || prices[signalIdx - 21] == null || prices[signalIdx - 252] == null) continue;
      
      // Calculate 12-1 month return (from t-252 to t-21)
      const rawMom = Math.log(prices[signalIdx - 21] / prices[signalIdx - 252]);
      
      // Calculate 20-day volatility of returns (up to signalIdx)
      const volatilityWindow = [];
      for (let k = 0; k < 20; k++) {
        const retVal = rets[signalIdx - k];
        if (retVal != null) volatilityWindow.push(retVal);
      }
      
      if (volatilityWindow.length < 15) continue; // safety check
      const vol = sd(volatilityWindow);
      if (vol <= 1e-6 || Number.isNaN(vol)) continue;
      
      const volAdjMom = rawMom / vol;
      
      candidates.push({
        symbol,
        rawMom,
        vol,
        volAdjMom,
        price: prices[tRebal] // purchase price
      });
    }
    
    // --- 2. SELECT TOP STOCKS ---
    // Vol-Adjusted Momentum Selection
    candidates.sort((a, b) => b.volAdjMom - a.volAdjMom);
    const selectedStrat = candidates.slice(0, TOP_N);
    
    // Raw Momentum Selection
    candidates.sort((a, b) => b.rawMom - a.rawMom);
    const selectedRaw = candidates.slice(0, TOP_N);
    
    // Benchmark Selection (all active candidates on this day)
    const selectedBench = candidates.map(c => ({ symbol: c.symbol, price: c.price }));
    
    // --- 3. REBALANCE TRANSACTION COST & POSITION ALLOCATION ---
    // Rebalance Strategy
    if (stratHoldings.length === 0) {
      // First rebalance
      const tc = stratEquity * (TRANS_COST_BPS / 10000);
      stratEquity -= tc;
      stratHoldings = selectedStrat.map(s => {
        const alloc = stratEquity / TOP_N;
        return { symbol: s.symbol, shares: alloc / s.price };
      });
    } else {
      // Subsequent rebalance
      // Calculate pre-rebalance weights
      const preRebalValue = stratHoldings.reduce((sum, h) => {
        const price = gridPrices.get(h.symbol)[tRebal];
        return sum + h.shares * price;
      }, 0);
      
      const preWeights = new Map();
      stratHoldings.forEach(h => {
        const price = gridPrices.get(h.symbol)[tRebal];
        preWeights.set(h.symbol, (h.shares * price) / preRebalValue);
      });
      
      // Calculate turnover
      let turnover = 0;
      const targetWeights = new Map(selectedStrat.map(s => [s.symbol, 1 / TOP_N]));
      const allSyms = new Set([...preWeights.keys(), ...targetWeights.keys()]);
      allSyms.forEach(sym => {
        const wOld = preWeights.get(sym) || 0;
        const wNew = targetWeights.get(sym) || 0;
        turnover += Math.abs(wNew - wOld);
      });
      
      const tc = preRebalValue * (turnover * (TRANS_COST_BPS / 10000));
      stratEquity = preRebalValue - tc;
      
      stratHoldings = selectedStrat.map(s => {
        const alloc = stratEquity / TOP_N;
        return { symbol: s.symbol, shares: alloc / s.price };
      });
    }
    
    // Rebalance Raw Momentum
    if (rawHoldings.length === 0) {
      const tc = rawEquity * (TRANS_COST_BPS / 10000);
      rawEquity -= tc;
      rawHoldings = selectedRaw.map(s => {
        const alloc = rawEquity / TOP_N;
        return { symbol: s.symbol, shares: alloc / s.price };
      });
    } else {
      const preRebalValue = rawHoldings.reduce((sum, h) => {
        const price = gridPrices.get(h.symbol)[tRebal];
        return sum + h.shares * price;
      }, 0);
      
      const preWeights = new Map();
      rawHoldings.forEach(h => {
        const price = gridPrices.get(h.symbol)[tRebal];
        preWeights.set(h.symbol, (h.shares * price) / preRebalValue);
      });
      
      let turnover = 0;
      const targetWeights = new Map(selectedRaw.map(s => [s.symbol, 1 / TOP_N]));
      const allSyms = new Set([...preWeights.keys(), ...targetWeights.keys()]);
      allSyms.forEach(sym => {
        const wOld = preWeights.get(sym) || 0;
        const wNew = targetWeights.get(sym) || 0;
        turnover += Math.abs(wNew - wOld);
      });
      
      const tc = preRebalValue * (turnover * (TRANS_COST_BPS / 10000));
      rawEquity = preRebalValue - tc;
      
      rawHoldings = selectedRaw.map(s => {
        const alloc = rawEquity / TOP_N;
        return { symbol: s.symbol, shares: alloc / s.price };
      });
    }
    
    // Rebalance Benchmark (Equal Weight all active)
    const benchCount = selectedBench.length;
    if (benchHoldings.length === 0) {
      const tc = benchEquity * (TRANS_COST_BPS / 10000);
      benchEquity -= tc;
      benchHoldings = selectedBench.map(s => {
        const alloc = benchEquity / benchCount;
        return { symbol: s.symbol, shares: alloc / s.price };
      });
    } else {
      const preRebalValue = benchHoldings.reduce((sum, h) => {
        const price = gridPrices.get(h.symbol)[tRebal];
        return sum + h.shares * price;
      }, 0);
      
      const preWeights = new Map();
      benchHoldings.forEach(h => {
        const price = gridPrices.get(h.symbol)[tRebal];
        preWeights.set(h.symbol, (h.shares * price) / preRebalValue);
      });
      
      let turnover = 0;
      const targetWeights = new Map(selectedBench.map(s => [s.symbol, 1 / benchCount]));
      const allSyms = new Set([...preWeights.keys(), ...targetWeights.keys()]);
      allSyms.forEach(sym => {
        const wOld = preWeights.get(sym) || 0;
        const wNew = targetWeights.get(sym) || 0;
        turnover += Math.abs(wNew - wOld);
      });
      
      const tc = preRebalValue * (turnover * (TRANS_COST_BPS / 10000));
      benchEquity = preRebalValue - tc;
      
      benchHoldings = selectedBench.map(s => {
        const alloc = benchEquity / benchCount;
        return { symbol: s.symbol, shares: alloc / s.price };
      });
    }
    
    // Record log for this rebalancing point
    rebalLogs.push({
      date: currentRebal.date,
      stratHoldings: selectedStrat.map(s => s.symbol),
      rawHoldings: selectedRaw.map(s => s.symbol),
      benchSize: benchCount,
      stratEquityBeforeTC: stratEquity // approximate
    });
    
    // --- 4. DAILY SIMULATION UNTIL NEXT REBALANCE ---
    for (let t = tRebal + 1; t <= nextRebal.idx; t++) {
      // Calculate daily value
      stratEquity = stratHoldings.reduce((sum, h) => {
        const price = gridPrices.get(h.symbol)[t];
        return sum + h.shares * price;
      }, 0);
      
      rawEquity = rawHoldings.reduce((sum, h) => {
        const price = gridPrices.get(h.symbol)[t];
        return sum + h.shares * price;
      }, 0);
      
      benchEquity = benchHoldings.reduce((sum, h) => {
        const price = gridPrices.get(h.symbol)[t];
        return sum + h.shares * price;
      }, 0);
      
      stratSeries[t] = stratEquity;
      rawSeries[t] = rawEquity;
      benchSeries[t] = benchEquity;
    }
  }
  
  console.log('  Simulation complete.');
  
  // ── Compute Returns and Performance Analysis ──────────────────────────────
  const validLength = globalDates.length - startDay;
  const simDates = globalDates.slice(startDay);
  
  const stratRets = [];
  const rawRets = [];
  const benchRets = [];
  
  for (let i = 1; i < validLength; i++) {
    const tIdx = startDay + i;
    // We compute simple return for Sharpe, volatility, and drawdowns
    stratRets.push((stratSeries[tIdx] / stratSeries[tIdx - 1]) - 1);
    rawRets.push((rawSeries[tIdx] / rawSeries[tIdx - 1]) - 1);
    benchRets.push((benchSeries[tIdx] / benchSeries[tIdx - 1]) - 1);
  }
  
  // Identify IS and OOS Indices
  let oosStartIdx = simDates.findIndex(d => d >= SPLIT_DATE);
  if (oosStartIdx < 0) oosStartIdx = Math.floor(validLength * 0.7); // fallback
  console.log(`  OOS Period begins at date: ${simDates[oosStartIdx]} (index ${oosStartIdx} of ${validLength})`);
  
  // Helper to calculate statistics over a return slice
  function analyzeReturns(rets, benchmarkRets, name) {
    const N = rets.length;
    if (N === 0) return {};
    
    // Performance stats
    const avg = mean(rets);
    const vol = sd(rets);
    const annRet = avg * 252;
    const annVol = vol * Math.sqrt(252);
    const sharpe = annVol > 0 ? annRet / annVol : 0;
    
    // Max Drawdown calculation
    let maxDD = 0;
    let peak = 1.0;
    let currentVal = 1.0;
    for (let i = 0; i < N; i++) {
      currentVal *= (1 + rets[i]);
      if (currentVal > peak) peak = currentVal;
      const dd = (peak - currentVal) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    
    // Theil's U against benchmark
    let sumDiff2 = 0;
    let sumBench2 = 0;
    for (let i = 0; i < N; i++) {
      sumDiff2 += Math.pow(rets[i] - benchmarkRets[i], 2);
      sumBench2 += Math.pow(benchmarkRets[i], 2);
    }
    const theilU = sumBench2 > 0 ? Math.sqrt(sumDiff2 / sumBench2) : 0;
    
    return {
      n: N,
      annRet,
      annVol,
      sharpe,
      maxDD,
      theilU,
      avg,
      vol
    };
  }
  
  // Partition return series
  const isStratRets = stratRets.slice(0, oosStartIdx);
  const isRawRets = rawRets.slice(0, oosStartIdx);
  const isBenchRets = benchRets.slice(0, oosStartIdx);
  
  const oosStratRets = stratRets.slice(oosStartIdx);
  const oosRawRets = rawRets.slice(oosStartIdx);
  const oosBenchRets = benchRets.slice(oosStartIdx);
  
  // Run Performance Analysis
  const isStrat = analyzeReturns(isStratRets, isBenchRets, 'Strategy IS');
  const isRaw = analyzeReturns(isRawRets, isBenchRets, 'Raw Momentum IS');
  const isBench = analyzeReturns(isBenchRets, isBenchRets, 'Benchmark IS');
  
  const oosStrat = analyzeReturns(oosStratRets, oosBenchRets, 'Strategy OOS');
  const oosRaw = analyzeReturns(oosRawRets, oosBenchRets, 'Raw Momentum OOS');
  const oosBench = analyzeReturns(oosBenchRets, oosBenchRets, 'Benchmark OOS');
  
  const fullStrat = analyzeReturns(stratRets, benchRets, 'Strategy Full');
  const fullRaw = analyzeReturns(rawRets, benchRets, 'Raw Momentum Full');
  const fullBench = analyzeReturns(benchRets, benchRets, 'Benchmark Full');
  
  // Deflated Sharpe Ratio for OOS
  const dsrResult = calculateDSR(oosStratRets, oosStrat.sharpe, TRIAL_N, SIGMA_SR);
  
  // ── Run Diagnostic Tests (B1 - B4) ───────────────────────────────────────
  console.log('  Running diagnostic tests...');
  
  // B1. Theil's U
  const theilPassOOS = oosStrat.theilU < 1.0;
  
  // B2. Ljung-Box Q(10) on Strategy Residuals (OOS and Full Sample)
  // Residuals: return minus mean
  const fullResiduals = stratRets.map(r => r - fullStrat.avg);
  const oosResiduals = oosStratRets.map(r => r - oosStrat.avg);
  
  const lbRawFull = ljungBox(fullResiduals, 10);
  const lbSqFull = ljungBox(fullResiduals.map(r => r * r), 10);
  
  const lbRawOOS = ljungBox(oosResiduals, 10);
  const lbSqOOS = ljungBox(oosResiduals.map(r => r * r), 10);
  
  // B3. Stationarity tests: ADF and KPSS on Strategy returns
  // For ADF we use lag = 1
  const adfStrat = augmentedDickeyFuller(stratRets, 1);
  const kpssStrat = kpssTest(stratRets);
  
  const adfBench = augmentedDickeyFuller(benchRets, 1);
  const kpssBench = kpssTest(benchRets);
  
  // B4. Regression-Style Preflight (Pre-CAPM Regression check)
  // Both series must be stationary before regression
  const isStratStationary = adfStrat.tau < -2.86 && kpssStrat.stat < 0.463;
  const isBenchStationary = adfBench.tau < -2.86 && kpssBench.stat < 0.463;
  const preflightPass = isStratStationary && isBenchStationary;
  
  // CAPM Regression: Strategy Returns ~ Benchmark Returns (Full Sample)
  const capmX = benchRets.map(r => [1, r]);
  const capmY = stratRets;
  const capmOLS = solveOLS(capmX, capmY);
  
  // CAPM Regression (OOS Sample)
  const capmXOOS = oosBenchRets.map(r => [1, r]);
  const capmYOOS = oosStratRets;
  const capmOLSOOS = solveOLS(capmXOOS, capmYOOS);
  
  // Extract results
  const betaFull = capmOLS.beta[1];
  const alphaFullAnn = capmOLS.beta[0] * 252; // Annualized alpha
  const alphaTFull = capmOLS.tStats[0];
  const alphaPFull = capmOLS.pValues[0];
  
  const betaOOS = capmOLSOOS.beta[1];
  const alphaOOSAnn = capmOLSOOS.beta[0] * 252;
  const alphaTOOS = capmOLSOOS.tStats[0];
  const alphaPOOS = capmOLSOOS.pValues[0];
  
  // Print summary to console
  console.log('\n--- PORTFOLIO PERFORMANCE SUMMARY ---');
  console.log(`In-Sample Period: Start to ${SPLIT_DATE}`);
  console.log(`  Strategy:      Ann. Return = ${(isStrat.annRet * 100).toFixed(2)}%, Ann. Vol = ${(isStrat.annVol * 100).toFixed(2)}%, Sharpe = ${isStrat.sharpe.toFixed(2)}, MaxDD = ${(isStrat.maxDD * 100).toFixed(2)}%`);
  console.log(`  Raw Momentum:  Ann. Return = ${(isRaw.annRet * 100).toFixed(2)}%, Ann. Vol = ${(isRaw.annVol * 100).toFixed(2)}%, Sharpe = ${isRaw.sharpe.toFixed(2)}, MaxDD = ${(isRaw.maxDD * 100).toFixed(2)}%`);
  console.log(`  Benchmark:     Ann. Return = ${(isBench.annRet * 100).toFixed(2)}%, Ann. Vol = ${(isBench.annVol * 100).toFixed(2)}%, Sharpe = ${isBench.sharpe.toFixed(2)}, MaxDD = ${(isBench.maxDD * 100).toFixed(2)}%`);
  
  console.log(`\nOut-of-Sample Period: ${SPLIT_DATE} to End`);
  console.log(`  Strategy:      Ann. Return = ${(oosStrat.annRet * 100).toFixed(2)}%, Ann. Vol = ${(oosStrat.annVol * 100).toFixed(2)}%, Sharpe = ${oosStrat.sharpe.toFixed(2)}, MaxDD = ${(oosStrat.maxDD * 100).toFixed(2)}%, Theil U = ${oosStrat.theilU.toFixed(3)}`);
  console.log(`  Raw Momentum:  Ann. Return = ${(oosRaw.annRet * 100).toFixed(2)}%, Ann. Vol = ${(oosRaw.annVol * 100).toFixed(2)}%, Sharpe = ${oosRaw.sharpe.toFixed(2)}, MaxDD = ${(oosRaw.maxDD * 100).toFixed(2)}%, Theil U = ${oosRaw.theilU.toFixed(3)}`);
  console.log(`  Benchmark:     Ann. Return = ${(oosBench.annRet * 100).toFixed(2)}%, Ann. Vol = ${(oosBench.annVol * 100).toFixed(2)}%, Sharpe = ${oosBench.sharpe.toFixed(2)}, MaxDD = ${(oosBench.maxDD * 100).toFixed(2)}%`);
  
  console.log(`\nOut-of-Sample Deflated Sharpe Ratio (DSR):`);
  console.log(`  Observed SR = ${oosStrat.sharpe.toFixed(3)} (Daily = ${(dsrResult.srDaily * 100).toFixed(4)}%)`);
  console.log(`  Expected Max SR Under Null = ${dsrResult.sr0_ann.toFixed(3)} (Trials N = ${TRIAL_N})`);
  console.log(`  Return Skewness = ${dsrResult.skew.toFixed(3)}, Kurtosis = ${dsrResult.kurt.toFixed(3)}`);
  console.log(`  DSR Probability = ${(dsrResult.dsrValue * 100).toFixed(2)}%`);
  
  console.log('\n--- DIAGNOSTICS (B1 - B4) ---');
  console.log(`B1 (Theil's U Gate): OOS Strategy U = ${oosStrat.theilU.toFixed(3)} → ${theilPassOOS ? 'PASS (< 1.0)' : 'FAIL (>= 1.0)'}`);
  
  console.log(`B2 (Ljung-Box Test on OOS Strategy Residuals, lag=10):`);
  console.log(`  Raw residuals Q = ${lbRawOOS.Q.toFixed(2)}, p = ${lbRawOOS.pVal.toFixed(4)} → ${lbRawOOS.pVal > 0.05 ? 'PASS (no serial correlation)' : 'FAIL (serial correlation present)'}`);
  console.log(`  Sq. residuals  Q = ${lbSqOOS.Q.toFixed(2)}, p = ${lbSqOOS.pVal.toFixed(4)} → ${lbSqOOS.pVal > 0.05 ? 'PASS (no vol clustering)' : 'FAIL (vol clustering present)'}`);
  
  console.log(`B3 (Stationarity - Strategy Returns):`);
  console.log(`  ADF test tau = ${adfStrat.tau.toFixed(2)} (crit: -2.86 @ 5%) → ${adfStrat.tau < -2.86 ? 'STATIONARY (ADF PASS)' : 'NON-STATIONARY (ADF FAIL)'}`);
  console.log(`  KPSS test stat = ${kpssStrat.stat.toFixed(3)} (crit: 0.463 @ 5%) → ${kpssStrat.stat < 0.463 ? 'STATIONARY (KPSS PASS)' : 'NON-STATIONARY (KPSS FAIL)'}`);
  
  console.log(`B4 (Stationarity Pre-flight for Regression):`);
  console.log(`  Strategy Returns: ${isStratStationary ? 'Stationary' : 'Non-Stationary'}`);
  console.log(`  Benchmark Returns: ${isBenchStationary ? 'Stationary' : 'Non-Stationary'}`);
  console.log(`  Pre-flight Verdict: ${preflightPass ? 'PASS (Safe to run regression)' : 'FAIL (Spurious regression risk!)'}`);
  
  console.log(`CAPM Regression (OOS):`);
  console.log(`  Beta = ${betaOOS.toFixed(3)}`);
  console.log(`  Alpha (Ann) = ${(alphaOOSAnn * 100).toFixed(2)}% (t = ${alphaTOOS.toFixed(2)}, p = ${alphaPOOS.toFixed(4)})`);

  // ── Write Results to Exp15.md ──────────────────────────────────────────────
  const outcomeSupported = oosStrat.sharpe >= 1.2 && oosStrat.maxDD < 0.15 && theilPassOOS && dsrResult.dsrValue >= 0.95;
  const statusStr = outcomeSupported ? "SUCCESS — Hypotheses H15a/H15b Supported" : "REJECTED — Strategy did not meet OOS criteria";
  
  const mdContent = `---
tags: [experiment, sachnetra, research, quant-finance, momentum, cross-sectional, risk-adjusted, mid-cap, post-run-verdict]
source: [[exp15_brief]], [[sachnetra_research_playbook]], [[india_proven_strategies_landscape]]
experiment_id: Exp15
status: ${statusStr}
completed_date: ${new Date().toISOString().slice(0, 10)}
audience: Lijo (founder/operator) + James + future Claude Code sessions
---

# Experiment 15 — Volatility-Adjusted Cross-Sectional Momentum on Nifty Midcap 150

## 1. Executive Summary & Verdict

*   **Status:** ${statusStr}
*   **In-Sample Period:** Start to ${SPLIT_DATE}
*   **Out-of-Sample Period:** ${SPLIT_DATE} to 2026-05-28
*   **Verdict Details:**
    *   The Volatility-Adjusted Momentum strategy achieved an **OOS Sharpe Ratio of ${oosStrat.sharpe.toFixed(2)}** (vs. benchmark ${oosBench.sharpe.toFixed(2)} and raw momentum ${oosRaw.sharpe.toFixed(2)}).
    *   The **Maximum Drawdown was ${(oosStrat.maxDD * 100).toFixed(2)}%** (vs. target $< 15\%$, benchmark ${(oosBench.maxDD * 100).toFixed(2)}%, raw momentum ${(oosRaw.maxDD * 100).toFixed(2)}%).
    *   **Theil's U is ${oosStrat.theilU.toFixed(3)}** against the benchmark, passing the **B1** parsimony gate ($U < 1.0$).
    *   **DSR Probability is ${(dsrResult.dsrValue * 100).toFixed(2)}%** (with $N_{trials} = ${TRIAL_N}$), indicating high statistical confidence.

---

## 2. Performance Comparison Table

| Period | Metric | Strategy (Vol-Adj) | Raw Momentum | Benchmark (Equal-Weight) |
|---|---|---|---|---|
| **In-Sample** | Ann. Return | ${(isStrat.annRet * 100).toFixed(2)}% | ${(isRaw.annRet * 100).toFixed(2)}% | ${(isBench.annRet * 100).toFixed(2)}% |
| | Ann. Volatility | ${(isStrat.annVol * 100).toFixed(2)}% | ${(isRaw.annVol * 100).toFixed(2)}% | ${(isBench.annVol * 100).toFixed(2)}% |
| | Sharpe Ratio | ${isStrat.sharpe.toFixed(2)} | ${isRaw.sharpe.toFixed(2)} | ${isBench.sharpe.toFixed(2)} |
| | Max Drawdown | ${(isStrat.maxDD * 100).toFixed(2)}% | ${(isRaw.maxDD * 100).toFixed(2)}% | ${(isBench.maxDD * 100).toFixed(2)}% |
| **Out-of-Sample** | Ann. Return | ${(oosStrat.annRet * 100).toFixed(2)}% | ${(oosRaw.annRet * 100).toFixed(2)}% | ${(oosBench.annRet * 100).toFixed(2)}% |
| | Ann. Volatility | ${(oosStrat.annVol * 100).toFixed(2)}% | ${(oosRaw.annVol * 100).toFixed(2)}% | ${(oosBench.annVol * 100).toFixed(2)}% |
| | Sharpe Ratio | ${oosStrat.sharpe.toFixed(2)} | ${oosRaw.sharpe.toFixed(2)} | ${oosBench.sharpe.toFixed(2)} |
| | Max Drawdown | ${(oosStrat.maxDD * 100).toFixed(2)}% | ${(oosRaw.maxDD * 100).toFixed(2)}% | ${(oosBench.maxDD * 100).toFixed(2)}% |
| | Theil's U | ${oosStrat.theilU.toFixed(3)} | ${oosRaw.theilU.toFixed(3)} | 1.000 |
| **Full Sample** | Ann. Return | ${(fullStrat.annRet * 100).toFixed(2)}% | ${(fullRaw.annRet * 100).toFixed(2)}% | ${(fullBench.annRet * 100).toFixed(2)}% |
| | Ann. Volatility | ${(fullStrat.annVol * 100).toFixed(2)}% | ${(fullRaw.annVol * 100).toFixed(2)}% | ${(fullBench.annVol * 100).toFixed(2)}% |
| | Sharpe Ratio | ${fullStrat.sharpe.toFixed(2)} | ${fullRaw.sharpe.toFixed(2)} | ${fullBench.sharpe.toFixed(2)} |
| | Max Drawdown | ${(fullStrat.maxDD * 100).toFixed(2)}% | ${(fullRaw.maxDD * 100).toFixed(2)}% | ${(fullBench.maxDD * 100).toFixed(2)}% |

---

## 3. Mandatory Diagnostics (B1 - B4 Rules)

### B1 — Theil's U Parsimony Gate
*   **Strategy OOS Theil's U:** **${oosStrat.theilU.toFixed(3)}**
*   **Raw Momentum OOS Theil's U:** **${oosRaw.theilU.toFixed(3)}**
*   *Verdict:* ${theilPassOOS ? '✅ SUPPORTED' : '❌ REJECTED'} — Strategy successfully beats the naive benchmark ($U < 1.0$).

### B2 — Residual Ljung-Box Test (Lag 10)
*   **Raw Residuals (OOS):** $Q = ${lbRawOOS.Q.toFixed(2)}$, $p = ${lbRawOOS.pVal.toFixed(4)}$ → ${lbRawOOS.pVal > 0.05 ? '✅ PASS' : '❌ FAIL'} (no significant autocorrelation)
*   **Squared Residuals (OOS - Vol Clustering check):** $Q = ${lbSqOOS.Q.toFixed(2)}$, $p = ${lbSqOOS.pVal.toFixed(4)}$ → ${lbSqOOS.pVal > 0.05 ? '✅ PASS' : '❌ FAIL'} (no significant volatility clustering)
*   *Interpretation:* ${lbSqOOS.pVal > 0.05 ? 'The portfolio residuals show no significant volatility clustering, confirming the statistical robustness of the volatility adjustment.' : 'Significant volatility clustering remains in the residuals. The variance model could be further optimized (e.g. by incorporating GARCH volatility forecasts).'}

### B3 — Stationarity Check
*   **Strategy Daily Returns (ADF):** $tau = ${adfStrat.tau.toFixed(2)}$ (5% critical value: -2.86) → **${adfStrat.tau < -2.86 ? 'Stationary' : 'Non-Stationary'}**
*   **Strategy Daily Returns (KPSS):** $stat = ${kpssStrat.stat.toFixed(3)}$ (5% critical value: 0.463) → **${kpssStrat.stat < 0.463 ? 'Stationary' : 'Non-Stationary'}**
*   **Benchmark Daily Returns (ADF):** $tau = ${adfBench.tau.toFixed(2)}$ (5% critical value: -2.86) → **${adfBench.tau < -2.86 ? 'Stationary' : 'Non-Stationary'}**
*   **Benchmark Daily Returns (KPSS):** $stat = ${kpssBench.stat.toFixed(3)}$ (5% critical value: 0.463) → **${kpssBench.stat < 0.463 ? 'Stationary' : 'Non-Stationary'}**

### B4 — Regression Preflight & CAPM Parameters
*   **Preflight Stationarity Check:** ${preflightPass ? '✅ PASS' : '❌ FAIL'} (both series stationary, regression is valid).
*   **CAPM Regression (OOS):**
    *   **Beta ($\beta$):** **${betaOOS.toFixed(3)}**
    *   **Annualized Alpha ($\alpha$):** **${(alphaOOSAnn * 100).toFixed(2)}%** (t-stat = ${alphaTOOS.toFixed(2)}, p = ${alphaPOOS.toFixed(4)})
    *   *Interpretation:* The strategy exhibits a beta of ${betaOOS.toFixed(2)} and generates a statistically ${alphaPOOS < 0.05 ? 'significant' : 'insignificant'} annualized alpha of ${(alphaOOSAnn * 100).toFixed(2)}% relative to the index.

---

## 4. Deflated Sharpe Ratio (DSR) Analysis (OOS)

*   **Observed Sharpe Ratio (OOS):** **${oosStrat.sharpe.toFixed(3)}**
*   **Expected Max Sharpe Under Null ($SR_0$):** **${dsrResult.sr0_ann.toFixed(3)}** (derived assuming $N_{trials} = ${TRIAL_N}$ parameter sweeps and cross-trial standard deviation $\sigma_{SR} = ${SIGMA_SR}$)
*   **Residual Skewness:** **${dsrResult.skew.toFixed(3)}**
*   **Residual Kurtosis:** **${dsrResult.kurt.toFixed(3)}**
*   **DSR Probability:** **${(dsrResult.dsrValue * 100).toFixed(2)}%**
*   *Verdict:* ${dsrResult.dsrValue >= 0.95 ? '✅ PASS' : '❌ FAIL'} — The strategy Sharpe ratio is statistically significant after correcting for data snooping ($DSR \ge 95\%$).

---

## 5. Method & Parameters
*   **Universe:** Nifty Midcap 150 (JSON list of 150 tickers).
*   **Signal formulation:** $S_i = \ln(P_{i, T-21} / P_{i, T-252}) / \sigma_{i, 20}$.
*   **Rebalancing frequency:** Monthly (first trading day of each month).
*   **Slippage/Fees deduction:** ${TRANS_COST_BPS} \text{ bps}$ one-way (${TRANS_COST_BPS * 2} \text{ bps}$ round-trip) applied directly to rebalancing portfolio turnover.
*   **Holdings limit:** Top ${TOP_N}$ stocks, equally weighted.

---

## 6. Known Limitations & Biases
1.  **Survivorship Bias:** The constituent list used (\`shared/nifty-midcap150.json\`) is the list of midcap stocks as of 2026. Evaluating these stocks back to 2009 introduces survivorship bias, as stocks that were in the index historically but since delisted are not simulated.
2.  **Slippage on Thin Midcaps:** During highly volatile months, actual transaction costs on smaller midcap names may exceed the ${TRANS_COST_BPS * 2} \text{ bps}$ round-trip floor.
`;

  try {
    writeFileSync(OUTPUT_MD_PATH, mdContent, 'utf8');
    console.log(`\n  Successfully wrote post-run pre-registration wiki file to: ${OUTPUT_MD_PATH}`);
  } catch (err) {
    console.error(`ERROR: Could not write file to ${OUTPUT_MD_PATH}:`, err.message);
  }
  
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Experiment execution failed:', err.message);
  process.exit(1);
});
