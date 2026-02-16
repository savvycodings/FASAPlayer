# Product & price pathway (API → DB → Profile → Product screen)

How a **product** and its **market / eBay prices** flow from the API to the DB, then to the profile grid and the Product screen.

---

## 1. DB schema

- **collections** (your items): `id`, `userId`, `type`, `name`, `image`, **`cardId`** (Pokedata id), `set`, `condition`, …
- **card_prices** (cache from Pokedata): **`id`** (Pokedata card id), **`marketPrice`** (USD), **`ebayLastSold`** (USD), `currency`, `lastFetchedAt`, …

Prices are **not** stored on `collections`; they live in **`card_prices`** keyed by `cardId`. We only call the Pokedata API when the cache is missing or older than 48h.

---

## 2. API → DB (price cache)

- **Pokedata API** returns pricing (e.g. TCGPlayer, Pokedata Raw, eBay Raw) in **USD**.
- **lookup** (`server/src/pokedata/lookup.ts`): `getCardLookupOrFetch(id)` reads `card_prices` first; if missing or stale, calls the API, then **writes** `marketPrice` and `ebayLastSold` into `card_prices`.
- Server logs: `[Pokedata API] Price return — marketPrice (USD): X | ebayLastSold (USD): Y`.

---

## 3. Routes

- **POST /api/profile/collections** — Add card. If `cardId` is sent, we **await** `getCardLookupOrFetch(cardId)` so `card_prices` is filled before the client refetches.
- **GET /api/profile/collections** — List user’s collections. For each collection with a `cardId`, we **enrich** from `card_prices`:
  - Select `id`, `marketPrice`, `ebayLastSold` from `card_prices` where `id` in collection `cardId`s.
  - Attach **`marketPrice`** and **`ebayLastSold`** (USD) to each collection in the response.
  - Portfolio value = sum of `marketPrice * USD_TO_ZAR` (and legacy fields for items without `cardId`).

---

## 4. App: Profile → products

- **profile.tsx** calls **GET /api/profile/collections** and gets `collections` with `marketPrice` and `ebayLastSold` (USD) when present.
- Builds **products**:
  - **price** (label): `marketPrice` → ZAR → `"R{value}"` (or legacy / R0).
  - **ebayLastSoldZar**: `ebayLastSold` → ZAR (or `undefined` if none).
- **ProductGrid** receives `products` and shows `product.price` (market in ZAR).

---

## 5. App: Product screen

- **onProductPress(product)** → `navigation.navigate('Product', { name, image, category, price, ebayPrice, description })`.
  - **price** = market value in ZAR (parsed from `product.price`).
  - **ebayPrice** = `product.ebayLastSoldZar` (eBay last sold in ZAR).
- **Product screen** (`app/src/screens/product.tsx`):
  - **Market value**: `price` (route param) → `R{displayPrice}`.
  - **eBay last sold**: if `ebayPrice` is present and > 0, shows `R{ebayPrice}`.

So: **market** and **eBay** both come from **card_prices** (API/cache), are converted to ZAR on the server/app, and both are shown on the Product screen.

---

## Summary

| Step            | Where                | What happens |
|-----------------|----------------------|--------------|
| Price source    | Pokedata API         | USD: market (TCGPlayer/Raw), eBay Raw |
| Storage         | `card_prices`        | By Pokedata `id`; 48h cache |
| Add card        | POST /collections    | Save collection; prime cache (await) |
| Load list       | GET /collections     | Enrich with `marketPrice`, `ebayLastSold` from `card_prices` |
| Profile grid    | products             | `price` = market ZAR; `ebayLastSoldZar` for Product |
| Product screen  | route params         | Shows **Market value** (R) and **eBay last sold** (R) when available |
