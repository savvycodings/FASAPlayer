# Daily card price sync

## Overview

`pnpm run sync-card-prices` fetches Pokedata pricing for every card in `market_cards`, upserts `card_prices`, and appends one row per card per calendar day in `card_price_history` (SA timezone).

The job is **checkpointed**: crashes and Ctrl+C do not restart from card zero.

## Commands

From repo root:

```bash
pnpm run sync-card-prices              # resume today's job or start new
pnpm run db:ensure-price-sync          # create job tables if missing
```

From `server/`:

```bash
pnpm run sync-card-prices -- --fresh           # new job for today
pnpm run sync-card-prices -- --job-id=UUID     # resume specific job
pnpm run sync-card-prices -- --retry-failures --job-id=UUID
pnpm run sync-card-prices -- --limit=500       # process 500 cards then exit 2
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Job completed for all cards |
| 2 | Paused / incomplete — safe to re-run with `--resume` |
| 1 | Fatal error |

## Cron example

```cron
0 3 * * * cd /path/to/FASAPlayer/server && pnpm run sync-card-prices --resume >> /var/log/fasa-price-sync.log 2>&1
```

Re-run until exit 0 if the catalog is large (may take many hours at ~1 req/s).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | required | Postgres |
| `POKEDATA_API_KEY` | required | Pricing API |
| `PRICE_SYNC_DELAY_MS` | 1200 | Delay between cards |
| `PRICE_SYNC_BATCH` | 50 | DB fetch batch size |
| `PRICE_SYNC_MAX_RETRIES` | 3 | Per-card API retries |

## Admin UI

Run `pnpm run web:dev` and open the admin (see `web/README.md`). Set `VITE_API_BASE_URL` and `VITE_ADMIN_SECRET` in `web/.env`.

## Related

- On-demand cache: `getCardLookupOrFetch` in `server/src/pokedata/lookup.ts` (48h TTL)
- Bulk stale refresh: `GET /api/pokedata/refresh-prices?limit=200`
- Mobile charts: `GET /pokedata/card/:id/price-history`
