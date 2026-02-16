# Card Prices, Images, and the Add Card Flow

This document describes how the app gets **prices** and **card images** from different sources, and how the **Add Card** → **Your Products** flow works end to end.

---

## 1. Where Prices and Images Come From

### Prices: Pokedata API only

- **Source:** [Pokedata](https://www.pokedata.io) pricing API (`/pricing`).
- **What we get:** Per-card pricing from multiple markets, including:
  - **TCGPlayer** (primary market price)
  - **Pokedata Raw**
  - **eBay Raw** (last sold)
- We use **USD** from these sources; the app converts to ZAR using `EXPO_PUBLIC_USD_TO_ZAR` / `USD_TO_ZAR` for display.

We do **not** call any other price API. All “market price” and “eBay last sold” values in the app come from Pokedata.

### Card images: no image API — direct URLs

- **Source:** [images.pokemontcg.io](https://images.pokemontcg.io) — a **static CDN**. We do **not** call a separate “image API.”
- **URL pattern:**  
  `https://images.pokemontcg.io/{setCode}/{cardNumber}_hires.png`  
  Example: `https://images.pokemontcg.io/sv8pt5/161_hires.png` (Prismatic Evolutions #161).

The CDN expects **set code** (e.g. `sv8pt5`, `mew`, `swsh12`), **not** set name (“Prismatic Evolutions”) or Pokedata’s numeric set ID (e.g. `557`) or short code (e.g. `PRE`). So we must **map** whatever Pokedata gives us into the correct set code.

### Set code mapping (critical for correct images)

Pokedata can return:

- Set **name** (e.g. `"Prismatic Evolutions"`)
- Numeric **set_id** (e.g. `557`)
- Short **set_code** (e.g. `"PRE"`)

The CDN only accepts **images.pokemontcg.io set codes** (e.g. `sv8pt5`). We keep a **hardcoded map** in two places (kept in sync):

- **Server:** `server/src/pokedata/setCodeMap.ts`
- **App:** `app/src/utils/pokemonTcgSetCodes.ts`

The map includes:

- **Set name → set code** (e.g. `"prismatic evolutions"` → `sv8pt5`)
- **Numeric set_id → set code** (e.g. `557` → `sv8pt5`)
- **Pokedata short codes → set code** (e.g. `pre` → `sv8pt5`)

So whenever we have a set name, numeric ID, or Pokedata code, we resolve it to the correct CDN set code before building the image URL.

---

## 2. Caching to Reduce API Usage

We avoid calling Pokedata more than necessary by caching both **search results** and **per-card pricing (+ image metadata)**.

### Search cache (`pokedata_search_cache`)

- **When:** User runs “Look up card” and we call `GET /pokedata/search?query=...`.
- **Logic:** Check DB for a row with the same normalized `query|assetType|language`. If found and younger than **24 hours**, return cached `results` and skip the API.
- **On cache miss:** Call Pokedata search API, store `{ id, name, set, number }` per result, then return. Same search by any user within 24h = no extra API call.

### Card price + image cache (`card_prices`)

- **When:** We need price (and set/number for image) for a specific card ID — e.g. user selects a search result (Add Card modal) or we load “Your Products” (profile).
- **Logic:**
  - Select from `card_prices` by Pokedata card `id`.
  - If a row exists and `lastFetchedAt` is within **48 hours**, we use that row. We **recompute** the image URL from `setId` + `cardNumber` (using the set-code map) so we never serve a stale/wrong URL.
  - If missing or stale, we call Pokedata **pricing** API once, then:
    - Store/update: `id`, `cardName`, `setName`, `setId`, `cardNumber`, `imageUrl`, `marketPrice`, `ebayLastSold`, `currency`, `lastFetchedAt`.
    - `setId` is the **resolved set code** (or Pokedata’s value if we can’t resolve). We build `imageUrl` as `https://images.pokemontcg.io/{setId}/{cardNumber}_hires.png` at **write** time so it’s correct for the CDN.

So: **prices** come from Pokedata; **image URLs** are built by us from set code + card number, and we cache the inputs (setId, cardNumber) and optionally the URL in `card_prices`.

---

## 3. Building the Card Image URL Everywhere

We always prefer building the URL from **set + card number** (using the set-code map) so we never show a wrong or stale URL (e.g. old `.../557/161_hires.png` or `.../pre/161_hires.png`).

- **Server**
  - **Lookup (cache hit):** Return `imageUrl = buildImageUrl(cached.setId, cached.cardNumber) ?? cached.imageUrl`.
  - **GET collections:** For each collection with a `card_prices` row, we build `cardImageUrl` using **collection set name** when available (e.g. “Prismatic Evolutions”) so we get the right code (e.g. `sv8pt5`), and card number from `card_prices` or `collection.cardNumber`. So: `setForImage = collection.set || prices.setId`, `cardNumForImage = prices.cardNumber ?? collection.cardNumber`, then `cardImageUrl = buildImageUrl(setForImage, cardNumForImage) ?? prices.imageUrl`.
- **App**
  - **Add Card modal:** `tcgUri = getPokemonTcgImageUrlFromSetNumber(set, cardNumber) || cardImageUrl` so the correct image stays even if the API returns an old `imageUrl`.
  - **Profile (Your Products):** Same idea: prefer URL built from `collection.set` (and `collection.cardNumber` when present), then `collection.cardImageUrl`, then fallbacks.

Shared helper:

- **Server:** `buildImageUrl(setId, cardNumber)` in `server/src/pokedata/lookup.ts` (uses `setToSetCode` from `setCodeMap.ts`).
- **App:** `getPokemonTcgImageUrlFromSetNumber(set, number)` in `app/src/utils/pokemonTcgImages.ts` (uses `setToSetCode` from `pokemonTcgSetCodes.ts`).

---

## 4. Add Card Process (Step by Step)

### 4.1 User opens Add Card modal

- Modal state: name, set, card number, type (card/sealed/slab), condition, grade, notes, etc.
- For **cards**, we do **not** allow uploading a photo; the image is always the TCG artwork from `images.pokemontcg.io` (built from set + number).

### 4.2 “Look up card”

- User fills name (and optionally set/card number) and taps **Look up card**.
- App calls: `GET {apiBaseUrl}/pokedata/search?query={name + number + set}&asset_type=CARD`.
- Server:
  - Rate-limits by IP.
  - Checks `pokedata_search_cache` for that query (24h TTL). If hit, returns cached `results`.
  - On miss: calls Pokedata `searchCards(query, assetType)`, stores `{ id, name, set, number }` per result in the cache, returns results.
- App shows a list of matches (id, name, set, number). We only show set in the Set field if it looks like a **full name** (not a short code like `"PRE"`) so the set name doesn’t get overwritten by a code.

### 4.3 User selects a result

- App sets: `cardId = item.id`, `name = item.name`, `cardNumber = item.number`, and `set` only if `item.set` is a full name (not a 2–5 letter code).
- App then calls: `GET {apiBaseUrl}/pokedata/card/{item.id}?asset_type=CARD` to get price and image metadata.
- Server (`getCardLookup` → `getCardLookupOrFetch`):
  - Rate-limits.
  - Looks up `card_prices` by `id`. If fresh (< 48h), returns cached row but **recomputes** `imageUrl` via `buildImageUrl(setId, cardNumber)`.
  - If missing or stale: calls Pokedata **pricing** API, then:
    - Derives `setId` (set code) from API’s `set_code` or from `setToSetCode(set_name / set_id)`.
    - Derives `cardNumber` from `num` / `number`.
    - Builds `imageUrl` and upserts into `card_prices` (id, cardName, setName, setId, cardNumber, imageUrl, marketPrice, ebayLastSold, currency, lastFetchedAt).
  - Response includes: `id`, `cardName`, `setName`, `setId`, `cardNumber`, `imageUrl`, `marketPrice`, `ebayLastSold`, `currency`, `lastFetchedAt`, `fromCache`.
- App updates modal:
  - **Set:** `data.setName ?? data.setId` so the field shows the **set name** (e.g. “Prismatic Evolutions”), not the code.
  - **Card number:** `data.cardNumber`.
  - **Image:** Prefer URL built from current `set` + `cardNumber` so the image never reverts to a wrong one when the API returns.

### 4.4 User submits “Add to collection”

- App sends: `POST {apiBaseUrl}/api/profile/collections` with body including `type`, `name`, `cardId`, `set`, `cardNumber`, `condition`, `grade`, `image` (optional; for non-cards), etc.
- Server:
  - Validates type/name.
  - Inserts into `collections`: `userId`, `type`, `name`, `description`, `image`, `cardId`, `set`, `cardNumber`, `condition`, `grade`, …
  - If `cardId` is present, **primes the price cache** by calling `getCardLookupOrFetch(cardId)` so the next GET collections already has price + setId/cardNumber in `card_prices`.
  - Optionally creates a vaulting request if requested.
- App refreshes profile data so the new item appears in “Your Products.”

### 4.5 Profile “Your Products” and portfolio value

- App calls: `GET {apiBaseUrl}/api/profile/collections`.
- Server:
  - Loads user’s rows from `collections`.
  - For each collection with a `cardId`, looks up `card_prices` by that id and gets `marketPrice`, `ebayLastSold`, `setId`, `cardNumber`, `imageUrl`.
  - For each collection, **builds** `cardImageUrl` using **set name when available**:  
    `setForImage = collection.set || prices.setId`,  
    `cardNumForImage = prices.cardNumber ?? collection.cardNumber`,  
    `cardImageUrl = buildImageUrl(setForImage, cardNumForImage) ?? prices.imageUrl`.  
  - Attaches `marketPrice`, `ebayLastSold`, `cardImageUrl` to each collection and returns them.
- App:
  - Converts USD → ZAR for display.
  - For the product image: prefers URL built from `collection.set` + `collection.cardNumber` (or setId/cardNumber), then `collection.cardImageUrl`, then `getPokemonTcgImageUrl(collection.cardId)` or a placeholder.

So the **same** card shows the **same** artwork in the Add Card modal and on the profile because we consistently use set name/number and the set-code map to build the CDN URL.

---

## 5. Summary Table

| Data            | Source                    | Caching / notes                                                                 |
|----------------|---------------------------|----------------------------------------------------------------------------------|
| Market price   | Pokedata pricing API      | Stored in `card_prices`; 48h TTL; reused for Add Card modal and profile.        |
| eBay last sold | Pokedata pricing API      | Same row in `card_prices`.                                                      |
| Search results | Pokedata search API       | `pokedata_search_cache`; 24h TTL; key = query + assetType + language.           |
| Card image     | images.pokemontcg.io (CDN)| No image API. URL = `/{setCode}/{cardNumber}_hires.png`; set code from our map. |
| Set code       | Our map (server + app)   | Set name / Pokedata set_id / Pokedata short code → images.pokemontcg.io code.  |

---

## 6. Important files

- **Server**
  - `server/src/pokedata/client.ts` — Pokedata API client (search, pricing).
  - `server/src/pokedata/setCodeMap.ts` — Set name/id/code → TCG set code.
  - `server/src/pokedata/lookup.ts` — `getCardLookupOrFetch`, `buildImageUrl`, 48h cache logic.
  - `server/src/pokedata/search.ts` — Search endpoint + 24h search cache.
  - `server/src/pokedata/cardLookup.ts` — `GET /pokedata/card/:id` handler.
  - `server/src/store/storeRouter.ts` — `POST/GET /api/profile/collections`; GET builds `cardImageUrl` from set name + number.
  - `server/src/db/schema.ts` — `collections`, `card_prices`, `pokedata_search_cache`.
- **App**
  - `app/src/utils/pokemonTcgSetCodes.ts` — Set code map (mirror of server).
  - `app/src/utils/pokemonTcgImages.ts` — `getPokemonTcgImageUrlFromSetNumber`, `getPokemonTcgImageUrl`.
  - `app/src/components/profile/AddCardModal.tsx` — Look up card, select result, submit; image from set+number first.
  - `app/src/screens/profile.tsx` — Fetches collections, builds product list; image from set+number then `cardImageUrl`.

This is how we get prices and images from different APIs (Pokedata for prices, CDN for images) and how the whole card-adding process works from search to “Your Products.”
