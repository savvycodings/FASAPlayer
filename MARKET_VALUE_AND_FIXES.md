# Market value fix & console fixes — what happened and how the stack does it

This doc explains the **market value R0 fix** and the **pointerEvents / shadow deprecation fixes**, and how the app + server stack work together so a card’s price flows from the API to the UI.

---

## 1. The problem

- **Pokedata API** sometimes returns **`marketPrice: 0`** (e.g. no TCGPlayer/Raw data) but **`ebayLastSold`** with a real value (e.g. 1128.74 USD).
- We were using **only** `marketPrice` for the main displayed value → **valueZar** and **priceStr** (e.g. “R11 000”) came from that. So when `marketPrice === 0`, the grid and Product screen showed **R0** even though we had a valid eBay price.

---

## 2. What we changed

### 2.1 Market value: use eBay when market is 0

**Where:** `app/src/screens/profile.tsx` (building `products` from `collections`).

**Logic:**

1. Read **marketPrice** and **ebayLastSold** (USD) from each collection (with snake_case fallbacks from the API).
2. Normalise to numbers: `marketNum`, `ebayNum` (or `null` if missing).
3. Choose a **primary USD value** for the main label:
   - If **marketNum > 0** → use **marketNum** (market price).
   - Else if **ebayNum > 0** → use **ebayNum** (eBay last sold).
   - Else → `null` (we’ll use legacy estimated/purchase or 0).
4. **valueZar** = `primaryUsd * USD_TO_ZAR` (or legacy fallback).
5. **ebayZar** = `ebayNum * USD_TO_ZAR` (for the Product screen).
6. **priceStr** = `"R{valueZar}"` (so the grid no longer shows R0 when only eBay has data).

So: **one** “primary” USD value drives the main price; when the API gives us 0 for market but a number for eBay, we use eBay for that primary value. Market and eBay are still both available for the Product screen (market value + “eBay last sold”).

### 2.2 pointerEvents deprecation

**Where:** `app/src/components/ui/menubar.tsx`.

**Change:** Replaced the deprecated **prop** `pointerEvents="box-none"` with **style**:  
`style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}` so the View uses `style.pointerEvents` as required by React Native.

### 2.3 shadow* / textShadow* deprecations (web)

**Where:**  
- `app/src/screens/shop.tsx` (suggestion dropdown).  
- `app/src/components/shop/RecentListings.tsx` (card + text overlays).

**Change:** On **web** we use the recommended style properties instead of the deprecated ones:

- **Shadow:** use a single **`boxShadow`** (e.g. `'0 8px 12px rgba(0,0,0,0.4)'`) instead of `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`.
- **Text shadow:** use a single **`textShadow`** (e.g. `'0 1px 3px rgba(0,0,0,0.5)'`) instead of `textShadowColor`, `textShadowOffset`, `textShadowRadius`.

We use **`Platform.OS === 'web'`** so that:
- On **web**: only `boxShadow` / `textShadow` are applied (no deprecation warnings).
- On **native**: we keep the original `shadow*` / `textShadow*` props so iOS/Android still render shadows correctly.

---

## 3. How the stack makes it work (end-to-end)

### 3.1 Data flow (prices)

```
Pokedata API (USD)
       ↓
server: lookup + card_prices (cache by card id; 48h)
       ↓
GET /api/profile/collections (enrich each collection with marketPrice, ebayLastSold)
       ↓
app: profile.tsx (collections → products)
       ↓
primaryUsd = market > 0 ? market : (ebay > 0 ? ebay : null)
valueZar   = primaryUsd * USD_TO_ZAR  (or legacy)
priceStr   = "R{valueZar}"
       ↓
ProductGrid (shows priceStr)  +  Product screen (market + eBay when available)
```

### 3.2 Roles of each layer

| Layer | Role |
|-------|------|
| **Pokedata API** | Source of truth in USD: market (TCGPlayer / Pokedata Raw) and eBay last sold. Some cards have `marketPrice: 0` but non-zero `ebayLastSold`. |
| **Server – card_prices** | Cache keyed by Pokedata card id; stores `marketPrice` and `ebayLastSold` (USD); 48h TTL so we don’t hit the API every time. |
| **Server – GET collections** | Reads user collections, joins/enriches with `card_prices` by `cardId`, returns each collection with `marketPrice` and `ebayLastSold` (and normalises so `0` is kept, not treated as null). |
| **App – profile.tsx** | Builds **products** from collections. Applies the **primary value** rule (market if > 0, else eBay), converts to ZAR, sets `price` (priceStr) and `ebayLastSoldZar` for navigation. |
| **App – ProductGrid** | Displays each product’s `price` (the main R value). No longer shows R0 when only eBay has data, because `price` is derived from primaryUsd (market or eBay). |
| **App – Product screen** | Receives `price` (market value in ZAR) and `ebayPrice` (eBay in ZAR); shows “Market value” and “eBay last sold” when present. |

So the “stack” that makes the fix work is: **API returns both market and eBay → we store both in `card_prices` → we send both in GET collections → profile picks a primary USD (market or eBay) and converts to ZAR → grid and Product screen show that value and still have eBay for the Product screen.**

### 3.3 Why it works now

- **Before:** Only `marketPrice` was used for the main value. If the API had `marketPrice: 0`, we showed R0 even when `ebayLastSold` had a real number.
- **After:** We still prefer `marketPrice` when it’s &gt; 0. When it’s 0 or missing, we use `ebayLastSold` for the **primary** value. So the same data from the same stack now produces a non-zero R value when eBay is the only available price, and we still show both “Market value” and “eBay last sold” on the Product screen where relevant.

---

## 4. Related docs

- **PRODUCT_PATHWAY.md** — Full path: API → DB → Profile → Product screen (schema, routes, products, navigation).
- **PROFILE_AND_STORE_SYSTEMS.md** — Profile = portfolio (price from API/DB); Store = only place to set listing price.
