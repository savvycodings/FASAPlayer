# Image hosting: My Store, Shop, and Profile

How images are **stored** and **displayed** in each place, and why Profile uses card API images while Store/Shop use Cloudinary.

---

## Summary

| Screen    | Image source | Where stored | What it shows |
|-----------|--------------|--------------|----------------|
| **My Store** (listings) | User upload → **Cloudinary** | `store_listings.card_image` | Photo of the physical card (seller’s own photo) |
| **Shop** (recent listings) | Same as My Store | `store_listings.card_image` | Same: Cloudinary URL from listing (photo of card) |
| **Profile** (collections) | **Card API / CDN** or Cloudinary | `collections.image` + `card_prices.image_url` | Official card artwork (images.pokemontcg.io) or user-uploaded photo |

---

## 1. My Store — listing images (Cloudinary)

**Flow**

- User creates/edits a listing and picks a **photo** (camera or gallery).
- App sends that image to the server; if it’s local (`file://` or `blob:`), it’s uploaded first via **Cloudinary**:
  - `uploadImage(imageUri, 'gradeit/listings')` in `app/src/utils/imageUpload.ts`
  - Calls **POST `/images/upload-base64`** → server uploads to Cloudinary → returns `secureUrl`.
- **POST /api/store/listings** receives `cardImage` (must be a string URL). Server **requires** an image and **rejects** URLs that point to Pokemon TCG artwork:
  - `if (cardImage.includes('images.pokemontcg.io'))` → 400: *"Listing image must be a photo of your physical card, not card artwork."*
- That URL is stored in **`store_listings.card_image`** in the DB.

**Display**

- **GET /api/store/listings** returns `cardImage` for each listing.
- `myStore.tsx` maps it to `cardImage: listing.cardImage ? { uri: listing.cardImage } : fallback`.
- **StoreListings** → **ListingCard** renders `<Image source={cardImage} />`. So My Store always shows the **Cloudinary** (user) image or a placeholder.

**Conclusion:** My Store listings are **hosted in Cloudinary** and are meant to be **photos of the physical card**, not official artwork.

---

## 2. Shop page — recent listings (same as My Store)

**Flow**

- Shop fetches **GET /api/listings/recent** (public). Server reads `store_listings` and returns `cardName`, **cardImage**, `price`, store/seller info.
- `cardImage` is the same **`store_listings.card_image`** value — i.e. the Cloudinary URL saved when the listing was created.

**Display**

- **RecentListings** (`app/src/components/shop/RecentListings.tsx`):
  - `imageSource = item.cardImage ? { uri: item.cardImage } : null`
  - Renders `<Image source={imageSource} />` or a placeholder if no `cardImage`.

**Conclusion:** Shop recent listings use the **same Cloudinary URLs** as My Store; no card API and no `images.pokemontcg.io` here.

---

## 3. Profile — collections (card API + CDN, or Cloudinary)

**Flow**

- Profile shows the user’s **collection** (cards/sealed/slabs). Data comes from **GET /api/profile/collections**.
- Server enriches each collection item that has a **cardId** with data from **`card_prices`** (Pokedata cache), including **`imageUrl`**:
  - `imageUrl` is either from the Pokedata API or built from set code + card number → **`https://images.pokemontcg.io/{setCode}/{number}_hires.png`**.
- Server sends back **`cardImageUrl`** (and price fields) on each collection item. So Profile gets **official card artwork URLs** when we have a linked card.

**Display (profile.tsx)**

For each collection item we build a single image source in this order:

1. **`collection.cardImageUrl`** — from server (from `card_prices.imageUrl` / Pokedata or built CDN URL).
2. **`getPokemonTcgImageUrlFromSetNumberIfOnCdn(set, number)`** — build CDN URL only when set is on the CDN (avoids 404s for sets like Ascended Heroes).
3. **`getPokemonTcgImageUrl(collection.cardId)`** — build from cardId (e.g. `set-number` format) → `images.pokemontcg.io`.
4. **`collection.image`** — user-uploaded image when they added the card (stored in **Cloudinary**, same as collections upload to `gradeit/collections`).
5. Fallback: default placeholder asset.

So on Profile we **prefer card API / CDN artwork**; only if that’s not available do we use the **Cloudinary** image the user uploaded for that collection item.

**Adding a card on Profile**

- When the user adds a card (with or without linking to Pokedata), any custom photo is uploaded via **`uploadImage(..., 'gradeit/collections')`** and saved as **`collections.image`**. That’s used only when we don’t have a good card artwork URL from the API/CDN.

**Conclusion:** Profile is built to show **official card images** (Pokedata + **images.pokemontcg.io**) when possible; Cloudinary is fallback for user-uploaded collection photos.

---

## 4. Differences in one place

- **My Store & Shop**
  - **Hosting:** Cloudinary only (user uploads at create/edit listing).
  - **What we show:** Photo of the physical card (seller’s photo). Server explicitly blocks `images.pokemontcg.io` for listings.
  - **DB:** `store_listings.card_image` = Cloudinary (or other allowed external) URL.

- **Profile**
  - **Hosting:** Card API + **images.pokemontcg.io** first; Cloudinary only when no card artwork is available.
  - **What we show:** Official card artwork when we have cardId/set/number; otherwise the user’s uploaded image for that collection item.
  - **DB:** `collections.image` = optional Cloudinary URL; `card_prices.image_url` (and server-built URLs) drive `cardImageUrl` for linked cards.

So: **Store/Shop = seller photos in Cloudinary; Profile = card API/CDN images with Cloudinary as fallback.**
