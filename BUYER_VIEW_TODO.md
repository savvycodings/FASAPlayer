# Buyer View: User Store Alignment (TODO)

This doc tracks work to make the **buyer view** of a user's store (ViewProfile / `GET /api/stores/:storeId`) behave like **My Store** and the **profile** flow: same image sources, ISO from each user, and eco-friendly reuse of card_prices for images and prices.

---

## 1. Listing images: Cloudinary (like My Store)

- **Current:** ViewProfile gets listings from `GET /api/stores/:storeId`; each listing has `cardImage` (DB value). My Store uses the same listings API and shows `cardImage` (Cloudinary URLs when user uploads).
- **Goal:** Ensure buyer view uses listing images the same way as My Store — i.e. **Cloudinary URLs** from `store_listings.card_image` (no change if backend already returns that).
- **Tasks:**
  - [ ] Confirm `GET /api/stores/:storeId` returns `cardImage` for each listing and that these are Cloudinary URLs when set.
  - [ ] In ViewProfile, ensure `StoreListings` (or equivalent) uses `listing.cardImage` as the image source (same as My Store). If any fallback is used (e.g. TCG URL), align with My Store behavior.

---

## 2. ISO section: load from each store’s ISO

- **Current:** ViewProfile may use sample/placeholder ISO or no ISO. My Store loads ISO via `GET /api/store/iso` (authenticated, own store).
- **Goal:** On the **buyer view** of a store, load that store’s **public ISO items** so buyers see “In Search Of” for that seller.
- **Tasks:**
  - [ ] Add a **public** endpoint, e.g. `GET /api/stores/:storeId/iso`, that returns ISO items for the given store (no auth required, or optional). Reuse the same `iso_items` table filtered by `store_id`.
  - [ ] In ViewProfile, when `storeId` is present, call `GET /api/stores/:storeId/iso` and set state for “viewed store ISO items”.
  - [ ] Render the ISO section in ViewProfile with that data (same layout as My Store ISO: image left, lines for name / set / number / price).

---

## 3. ISO card images: same as card module (TCG API / card_prices)

- **Current:** In My Store ISO we use `getPokemonTcgImageUrlFromSetNumberIfOnCdn(isoItem.set, isoItem.cardNumber)` or `isoItem.image`. Profile/card module uses `card_prices.image_url` or build from set + number via our set list.
- **Goal:** Buyer view ISO items should show card images the **same way**: prefer stored image URL, then TCG CDN from set + number (or from card_prices if we enrich).
- **Tasks:**
  - [ ] **Eco-friendly:** When returning ISO for a store (e.g. `GET /api/stores/:storeId/iso`), enrich each item with:
    - `imageUrl`: from `card_prices` by matching `(set_name, card_number)` to `(iso.set, iso.cardNumber)` so we reuse existing cached TCG image URLs where possible.
    - Or build image URL server-side with the same logic as `buildImageUrl` / set list (see `server/src/pokedata/lookup.ts` and `setCodeMap`).
  - [ ] Return `imageUrl` (and optionally `marketPrice`) on each ISO item so the client doesn’t need extra lookups.
  - [ ] In ViewProfile ISO list, use `isoItem.imageUrl || isoItem.image` for the image, with same fallback as My Store (placeholder + name if no URL).

---

## 4. Reuse card_prices for prices (and optionally images)

- **Current:** My Store ISO is enriched with `marketPrice` from `card_prices` (one query by set names). Buyer view ISO doesn’t have this yet.
- **Goal:** Reuse **card_prices** for both price and image on the buyer view so we stay eco-friendly (no extra Pokedata calls).
- **Tasks:**
  - [ ] In `GET /api/stores/:storeId/iso`, for each ISO item resolve `(set, cardNumber)` to a row in `card_prices` (same as GET /api/store/iso enrichment).
  - [ ] Attach `marketPrice` and `imageUrl` (from `card_prices.image_url`) to each ISO item in the response.
  - [ ] Client: show price (e.g. R … from USD×ZAR) and image from the enriched ISO item (same as My Store ISO block).

---

## 5. Summary checklist

| Area              | Source of truth / approach                                      |
|-------------------|------------------------------------------------------------------|
| Listing images    | Cloudinary (`store_listings.card_image`) — same as My Store     |
| ISO list (buyer)  | New `GET /api/stores/:storeId/iso` returning that store’s ISO   |
| ISO card images   | Prefer `card_prices.image_url`, else build from set+number (TCG)|
| ISO card prices   | From `card_prices` (set_name + card_number match), same as My Store |

---

## 6. References

- **Card module / images:** `server/src/pokedata/lookup.ts` (`buildImageUrl`), `setCodeMap.ts`, `card_prices` schema; `app/src/utils/pokemonTcgImages.ts` (`getPokemonTcgImageUrlFromSetNumberIfOnCdn`).
- **Profile collections + card_prices:** `GET /api/profile/collections` enrichment with `cardImageUrl` and `marketPrice`; `CARD_MODULE_APIS_AND_TABLES.md`.
- **My Store ISO:** `GET /api/store/iso` + enrichment with `card_prices` by set name; My Store ISO UI (image left, name/set/number/price lines).
- **Store listings:** `GET /api/stores/:storeId` returns `listings[].cardImage`; ensure these are Cloudinary when set.
