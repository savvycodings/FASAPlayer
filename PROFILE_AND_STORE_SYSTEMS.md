# Profile (Portfolio) & Store Systems

This doc describes how **Profile** works as a **financial portfolio**, where **price data** comes from (API → DB, 48h cache), and where users **set selling price** (Store only).

---

## Static → dynamic price data

- **Price data** comes from the **Pokedata API** (market price in USD). We **store it in the DB** (`card_prices`).
- We **only hit the API** when the cache is missing or older than **48 hours**. The rest of the time we read from the DB.
- So: **API → DB**; profile and portfolio use **DB** for market price. No manual “estimated price” or “bought for” when adding a card.

---

## Profile = Financial Portfolio

The **Profile** tab is your **collection and portfolio**: what you own and what it’s worth.

- **Collections** = your cards, sealed product, slabs (stored in `collections`).
- **Portfolio value** = sum of **market prices** (from `card_prices`, converted to ZAR) for items with a linked `cardId`; legacy items without `cardId` can still use stored `estimatedValue`/`purchasePrice` if present.
- **ProductGrid** shows each item’s **market price in ZAR** (from DB). No “estimated price” or “purchase price” inputs when adding a card.

### Adding a card

- You do **not** enter estimated value or purchase price. When you **link a card** (Look up card → select result), we prime the **card_prices** cache (or use existing cache). The **market price** for that card is then read from the DB when we load your collection and display it in the grid and in portfolio value.
- For cards **not** linked to Pokedata (`cardId`), we have no API price; portfolio value for that item is 0 (or legacy value if it was stored earlier).

### Buying vs selling

- **Profile** = what you **own** and its **market value** (from API/DB). You don’t set “price” here.
- **Store** = where you **sell**. You set the **listing price** (your asking price in R) only when creating/editing a listing.

---

## Store = Where You Set Selling Price

The **Store** (e.g. “List item”, “Create listing”) is the **only** place users set the **price at which they are selling** a card.

- You choose an item from your **collection** (Profile) and create a **listing**.
- You enter the **listing price** (your asking price in R).
- That listing price is what buyers see and pay; it is **independent** of the API market value.

---

## Summary

| Where        | What price means           | Source / who sets it                    |
|-------------|----------------------------|----------------------------------------|
| **Profile** | Market value (portfolio)   | API → stored in DB; read every 48h max |
| **Profile** | ProductGrid card price     | Same: DB (`card_prices`), shown in ZAR |
| **Store**   | Listing / asking price     | User (only place you set sell price)   |

- **API** gives USD market price → we store it in **DB** and only call the API again after 48h for fresh data.
- **Profile** uses that stored data for portfolio value and product prices; no manual price fields when adding a card.
- **Users change price only in the Store** when creating or editing a listing.
