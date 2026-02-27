# Lookup flow & how many cards a search returns (e.g. Absol)

## What changed: no extra click after “Look up card”

When you type a name (e.g. **Absol**) and tap **Look up card**:

1. The app calls **GET /pokedata/search?query=absol&asset_type=CARD** (via server; results are cached 24h in `pokedata_search_cache`).
2. The server calls **Pokedata’s search API** and returns an array of matches.
3. **Before:** We showed the list and you had to tap one to fill the form and fetch price.
4. **Now:** We **auto-apply the first result** — we call the same “select” logic for `list[0]` right after the search returns. So the form is filled and the price is fetched without a second tap. The list is still there if you want to tap a different row (e.g. a different set/number).

We still **sort** the list when you entered a card number (exact number match goes first), so the “first” result is usually the right one.

---

## How many “Absol” cards do we get from search?

- We **request only 3** (default) via **GET /pokedata/search?query=...&limit=3**. Eco: we almost always use the first; the other 2 are there in case the user taps “wrong set”.
- **How we pick the right card:** If you entered a **card number** (e.g. 172), we **sort** the results so the one with that number is **first**. Then we auto-apply the first. So “first” is usually the exact printing (name + set + number). If not, the user can tap one of the other 2 from the list.
- The Pokedata API may still return more (e.g. 50) if it doesn’t honour `limit`; we **slice to 3** and only cache/return 3.
- We **don’t fetch prices** in the search step. We only fetch price when you **select** a card (or when we auto-select the first), which calls **GET /pokedata/card/:id** and updates `card_prices`. So:
  - **Search “absol”** → many card **ids** (one per printing).
  - **Number of Absol cards we have prices for** = number of those **ids** that have been selected at least once (and thus are in **card_prices**). That grows as users (or you) look up different Absol printings.

You could later use “how many results for query X” (e.g. Absol) for:
- Suggesting “did you mean one of these?” when there are many matches.
- Analytics (e.g. which card names are searched most).
- Bulk “prime” the price cache for the first N results (e.g. prefill prices for top 5 Absol cards).

---

## What the two server scripts do (they don’t control “how many Absol” search returns)

### `server/scripts/fetch-card-price-history.ts`

- **Purpose:** Append **one new price point per card** to **card_price_history** (for the product chart over time).
- **Input:** Every card **id** already in **card_prices** (from past lookups / add-card / create-listing).
- **Flow:** For each id, calls Pokedata **pricing API** once, then inserts one row into **card_price_history** (marketPrice, ebayLastSold, recordedAt). Throttles ~1 request/sec.
- **So:** “How many Absol prices we have in history” = how many Absol **ids** are in **card_prices** × how many times you’ve run this script (each run adds one new point per id).

### `server/scripts/fetch-pokemon-tcg-sets.ts`

- **Purpose:** Fetch the **full list of Pokémon TCG sets** from **api.pokemontcg.io** (not Pokedata) and write **server/src/pokedata/pokemonTcgSets.json** and **app/src/utils/pokemonTcgSets.json**.
- **Use:** Set picker (e.g. in Add Card / ISO) and set-name → set-code mapping. No relation to how many Absol cards Pokedata returns; it’s just “all sets” for the app.

---

## Summary

| Question | Answer |
|----------|--------|
| Do I still need to tap a result after “Look up card”? | No. The first result (after optional sort by card number) is applied automatically. |
| How many Absol cards does search return? | Typically many (dozens); exact number from Pokedata. Check server log “Found N cards” for query `absol`. |
| How many Absol *prices* do we have? | One per distinct Absol **id** that’s been looked up (stored in **card_prices**). |
| What does fetch-card-price-history do? | Adds one new historical price point per card in **card_prices** into **card_price_history**. |
| What does fetch-pokemon-tcg-sets do? | Updates the TCG sets list (api.pokemontcg.io) in JSON for the app; unrelated to Absol count. |
