# Add card to profile & 48h price cache

## How you add a card

1. **Where:** Profile tab → **“Add Card”** button (top right of the “Your collection” section) → opens **AddCardModal** (`app/src/components/profile/AddCardModal.tsx`).

2. **What you enter:** Type (card/sealed/slab), name, optional image, set, condition, grade, estimated value, purchase price, notes. **cardId** (Pokedata card ID) is optional—you can paste it if you have it from search/grade.

3. **What happens when you tap “Add Card” in the modal:**
   - Image is uploaded to Cloudinary if it’s a local file.
   - App calls **POST /api/profile/collections** with `{ type, name, image, cardId?, set?, condition?, ... }`.
   - Server inserts a row into the **collections** table (your cards) and, **if `cardId` was sent**, calls the price lookup in the background to fill the **card_prices** cache (so future lookups don’t hit the API).

So: the **component** that adds a card is **AddCardModal**; the **button** that opens it is the **“Add Card”** button on the Profile screen.

---

## How the card is stored

- **Table:** `collections` (in Neon DB).
- **Row:** One per card you add: `userId`, `type`, `name`, `description`, `image` (URL), `cardId` (optional Pokedata id), `set`, `condition`, `grade`, `estimatedValue`, `purchasePrice`, etc.
- **Fetching your collection:** App calls **GET /api/profile/collections** (with auth). Server reads from `collections` for that user and returns the list. No Pokedata API involved here—it’s just your DB.

---

## How we fetch card *prices* and the 48h cache

Prices (market + eBay) come from **Pokedata**, which costs credits. To use credits only when needed we cache in **card_prices** and only call the API when the cache is missing or old.

1. **Cache table:** `card_prices` stores, per Pokedata card id: `marketPrice`, `ebayLastSold`, `lastFetchedAt`, etc.

2. **Single place that “fetches” price:** **GET /pokedata/card/:id** (and the shared helper `getCardLookupOrFetch` in `server/src/pokedata/lookup.ts`):
   - It **always looks in the DB first** (`card_prices` by that `id`).
   - If a row exists and **lastFetchedAt is less than 48 hours ago** → we **return that row** and do **not** call Pokedata (`fromCache: true`).
   - If there’s no row or **lastFetchedAt is older than 48 hours** → we **call Pokedata** pricing API, then **upsert** into `card_prices` (update `marketPrice`, `ebayLastSold`, `lastFetchedAt`) and return that (`fromCache: false`).

3. **48h rule:** We only call the external API for a given card id **at most once every 48 hours**. Everyone (all users) shares the same cache for that card id. So if you look up a card, we cache it; if someone else looks up the same card within 48h, they get the DB copy and we don’t spend credits again.

4. **When the cache gets filled (without you “looking up” first):**
   - When you **add a card to profile** with a **cardId** → server, after saving to `collections`, calls `getCardLookupOrFetch(cardId)` in the background → cache is primed.
   - When you **create a listing** with a **cardId** → same: after creating the listing we call the lookup so the price is in `card_prices` for next time.

So: **store** = `collections` (your cards). **Fetch (for display)** = your collection from `collections`; **price fetch** = `card_prices` first, Pokedata only if cache is missing or older than 48h.
