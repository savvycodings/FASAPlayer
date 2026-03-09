# PokeDATA 48h cache and “one link” refresh all prices

## How the 48h logic works

- **Where:** The logic lives in the server’s PokeDATA lookup layer (`server/dist/pokedata/lookup.js`; source may be in `server/src/pokedata/` if present).  
- **Constant:** `CACHE_TTL_MS = 48 * 60 * 60 * 1000` (48 hours).
- **When we call PokeDATA:** For a given card ID, we read from `card_prices`. If there is a row and `last_fetched_at` is **newer** than `now - 48h`, we return the cached row and **do not** call the PokeDATA API. If the row is missing or `last_fetched_at` is older than 48h, we call the PokeDATA pricing API, then:
  - upsert `card_prices` (id, marketPrice, ebayLastSold, lastFetchedAt, etc.),
  - insert/update `card_price_history` for **today** (one row per card per calendar day, `recordedDate` YYYY-MM-DD).
- **When it runs:** This runs **on demand per card** when something requests that card, e.g.:
  - Opening a product page (GET card by id),
  - Loading profile/collections (we resolve prices for each card),
  - Adding a card to collection or creating a listing (we “prime” that one card).

So **by default there is no cron**: each card is refreshed only when it’s requested and its cache is older than 48h.

---

## One link to update all card prices (not one-by-one)

We do **not** update all cards by opening each product one-by-one. Instead there is a **single endpoint** that refreshes many cards in one request.

### Endpoint

- **URL:** `GET /api/pokedata/refresh-prices`
- **Query (optional):** `?limit=N` — max number of **stale** cards to refresh in this call (default `200`, max `500`).
- **Behaviour:**  
  - Selects from `card_prices` all rows where `last_fetched_at < (now - 48h)` (stale), up to `limit`.  
  - For each of those card IDs, calls the same internal `getCardLookupOrFetch(id, 'CARD')` used elsewhere, which hits PokeDATA, updates `card_prices` and appends/updates `card_price_history` for today.  
  - Returns JSON: `{ ok, refreshed, totalStale, ids }`.

### One link examples

- **Refresh up to 200 stale cards (default):**  
  `https://your-server.com/api/pokedata/refresh-prices`

- **Refresh up to 500 stale cards:**  
  `https://your-server.com/api/pokedata/refresh-prices?limit=500`

- To refresh **all** stale cards when there are more than 500: call the link repeatedly (e.g. in a cron every few hours) until `totalStale` is 0 or small; or run a small script that loops until `refreshed === 0`.

### Cron / automation

You can call this URL from a cron job or scheduler so that all cards’ prices are updated in bulk (e.g. daily), instead of relying only on per-card requests. The endpoint does not require auth by default; in production you can protect it (e.g. cron secret in query, or firewall) as documented in your hosting setup.

---

## Summary

| Topic | Detail |
|--------|--------|
| 48h rule | Cache in `card_prices`; if `last_fetched_at` &lt; 48h ago we use cache; else we call PokeDATA and update `card_prices` + `card_price_history` for today. |
| Per-card refresh | Happens when that card is requested (product page, profile, add card, create listing). |
| One-link refresh | `GET /api/pokedata/refresh-prices` (optional `?limit=N`) refreshes **all stale** cards in one go, so you don’t have to open each card one-by-one. |
