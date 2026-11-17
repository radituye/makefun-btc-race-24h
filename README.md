[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/radituye/makefun-btc-race-24h/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/radituye/makefun-btc-race-24h/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

# Range Rider — BTC 24h race bot

A range-trading bot for make.fun's "Race a BTC trading bot live for 24 hours"
(`btc-race-24h-20261117-0603`). Paper money only: it trades $1,000 of paper
USDC against real on-chain cbBTC 1-minute prices.

Entry for the make.fun bounty: https://make.fun/bounty/btc-race-24h-20261117-0603

## Strategy

cbBTC trades in a range. The bot buys near the bottom of the rolling range
and sells near the top, one full-size position at a time, long only, with a
1% stop-loss.

- Lookback: 480 bars (8 hours) of closes for the rolling range.
- Buy: flat and close <= low + 15% of (high - low).
- Sell: holding and close >= high - 5% of (high - low).
- Stop: holding and close <= 1% below the entry close.
- Size: whole cash on a buy, whole position on a sell.

## Dev window result

Graded locally with the kit (`grade-local --driver process`):

- Net PnL **+$30.82** on 5 trades, max drawdown 0.72%.
- Baselines on the same window: buy-and-hold +$1.07, momentum +$2.45,
  ema-cross -$106.21, rsi-bollinger -$24.25, adx-momentum -$32.66.

The window is flat (+0.49% net) and range-bound, so trend and crossover
bots are whipsawed by the ~26 bps round-trip cost while this bot only
trades on the range extremes.

## Files

- `main.ts` — the bot (Node 22, standard library only via the vendored shim).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's bars SDK shim.
- `LICENSE` — MIT.

## Run

```sh
node main.ts   # speaks agent-fun/bars-replay/v1 on stdin/stdout
```
