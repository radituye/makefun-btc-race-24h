// Range Rider — a range-trading bot for the make.fun BTC 24h race.
//
// Idea: cbBTC trades in a range. The bot buys near the bottom of the rolling
// range and sells near the top, one full-size position at a time, long only.
// A 1% stop-loss cuts a position that keeps falling after entry.
//
//   - Lookback: 480 bars (8 hours) of closes for the rolling range.
//   - Buy: flat and close <= low + 20% of (high - low).
//   - Sell: holding and close >= high - 5% of (high - low).
//   - Stop: holding and close <= 1% below the entry close.
//   - Size: the whole cash on a buy, the whole position on a sell.
//   - Slippage is left wide open (10_000 bps): fills are small against the
//     pool depth, so a fill moves only a few bps and never trips the cap.
//
// Why this beats the baselines on the dev window: the window is flat
// (+0.49% net) and range-bound ($63,874-$65,467), so trend and crossover
// bots are whipsawed by the ~26 bps round-trip cost while this bot only
// trades on the range extremes. Dev: +$28.25 on 6 trades, 0.74% max
// drawdown (buy-and-hold +$1.07, momentum +$2.45, ema-cross -$106).
//
// Deterministic: no clock, no environment, no randomness. The same bars
// always produce the same orders. Standard library only (node:readline via
// the vendored shim).
//
// Laid out like an entrant's repository: the grader runs `node /bot/main.ts`
// with this directory mounted at /bot; vendor/makefun-bars.ts is a
// byte-identical copy of bars/sdk/makefun-bars.ts.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

/** Bars of closes kept for the rolling range (8 hours). */
const LOOKBACK_BARS = 480;
/** Buy when the close is within this share of the range above the low. */
const BUY_ZONE = 0.2;
/** Sell when the close is within this share of the range below the high. */
const SELL_ZONE = 0.05;
/** Stop out when the close falls this far below the entry close. */
const STOP_PCT = 0.01;
/** Slippage left wide open: fills are a few bps against the pool depth. */
const MAX_SLIPPAGE_BPS = 10_000;

/** The closes seen so far, in bar order. */
const closes: bigint[] = [];
/** The close the current position was opened at, null while flat. */
let entryClose: bigint | null = null;

await runBars({
  onBatch(state: BarsState) {
    const close = state.close('CBBTC');
    if (close === null) return [];
    closes.push(close);
    if (state.warmingUp) return [];
    if (closes.length < LOOKBACK_BARS) return [];

    const window = closes.slice(-LOOKBACK_BARS);
    let lo = window[0]!;
    let hi = window[0]!;
    for (const c of window) {
      if (c < lo) lo = c;
      if (c > hi) hi = c;
    }
    if (hi === lo) return [];
    const range = hi - lo;
    // Integer thresholds: buy at or below low + 20% of the range,
    // sell at or above high - 5% of the range.
    const buyAt = lo + (range * 20n) / 100n;
    const sellAt = hi - (range * 5n) / 100n;
    const holding = state.positions.get('CBBTC');

    if (holding !== undefined) {
      // Stop-loss first: cut the position if it fell 1% under entry.
      if (entryClose !== null && close * 100n <= entryClose * 99n) {
        entryClose = null;
        return [{ side: 'sell', symbol: 'CBBTC', qty: holding.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      if (close >= sellAt) {
        entryClose = null;
        return [{ side: 'sell', symbol: 'CBBTC', qty: holding.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    if (close <= buyAt) {
      const cash = state.cash;
      if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      entryClose = close;
      return [{ side: 'buy', symbol: 'CBBTC', notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
