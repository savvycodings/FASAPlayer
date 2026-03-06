# Verify (Vaulting) System & Buying Process — Current State & Requirements

This document captures how the **verification (vaulting)** system and **buying process** work today, and what the app needs to support for the **verify flow** (flat R100 payment, Pudo details, courier order, and user notification with dropoff code and tracking).

---

## Part 1: Current Verify (Vaulting) System

### 1.1 Data model (server)

- **`vaulted_requests`** table:
  - `id`, `userId`, `collectionId`, `cardName`, `cardImage`, `set`, `status`, `notes`, `createdAt`, `updatedAt`
  - `status`: `'pending'` | `'approved'` | `'vaulted'` | `'rejected'`
- **`collections`**: user’s cards; no vaulting-specific fields (vaulting is via `vaulted_requests`).
- **`store_listings`**: has `vaultingStatus` — `'seller-has'` | `'vaulted'` | `'vaulting-in-process'` | `'unverified'` (derived from `vaulted_requests` for that user/card).

### 1.2 Where vaulting is used in the app

| Location | What happens |
|----------|----------------|
| **Profile** | “Verify” button opens **BulkVaultingModal**. User selects collection items and submits → `POST /api/profile/vaulting/bulk` with `{ collectionIds }`. Server creates one `vaulted_request` per collection (status `pending`). No payment. |
| **Add Card Modal** | Checkbox “Request verification” → on submit, payload includes `requestVaulting: true`. `POST /api/profile/collections` creates the collection; if `requestVaulting` is true, server also inserts one row into `vaulted_requests` (same user, new `collectionId`, card name/image/set, status `pending`). No payment, no Pudo. |
| **Store / Listings** | Listings show **VaultingBadge** (vaulted / in-process / seller-has / etc.). Store router resolves vaulting status per listing by looking up `vaulted_requests` for that user + card name. |

### 1.3 Current gaps for “verify as a paid flow”

- **No payment** for verification: bulk and add-card vaulting only create DB rows; no PayFast.
- **No Pudo/locker** stored with vaulted requests: user’s Pudo is on `users` (`pudoAddress`, `pudoLockerCode`) but not sent or required when requesting verification.
- **No courier/fulfilment**: no handoff to “team to create courier order” or “dropoff code” or time limit (e.g. 24h).
- **No user-facing “submit at Pudo”** instructions or tracking after payment.

---

## Part 2: Current Buying Process (Bid / Buy Now + PayFast)

### 2.1 Product screen (listing)

- **Buy Now** / **Bid Now** open the same **PayFastPayment** modal; `paymentType` is `'buy'` or `'bid'`.
- **Before opening**: product screen loads buyer from session (`authClient.getSession()` → user id, email, name), then fetches profile for **Pudo pre-fill** (`GET /api/profile/user` → `pudoLockerCode`, `pudoAddress`).
- **PayFastPayment** receives: `amount`, `itemName`, `listingId`, `buyerId`, `sellerId`, `userEmail`, `userNameFirst`, `userNameLast`, `initialPudoLockerCode`, `initialShippingAddress`.
- For **listings**: modal shows **shipping form** (PUDO locker code + address) pre-filled from account; user can edit. On “Proceed to PayFast”, `createPayment({ pudoLockerCode, shippingAddress })` is called → `POST /payment/create-payment` with those + all buyer/seller/listing info.
- PayFast URL is opened in browser; on return/success, app polls `GET /payment/status/:paymentId`. Backend also receives **ITN** (Instant Transaction Notification) from PayFast.

### 2.2 Backend payment flow (PayFast)

- **Create payment** (`POST /payment/create-payment`):
  - Stores in memory: `paymentId`, `listingId`, `buyerId`, `sellerId`, `pudoLockerCode`, `shippingAddress`, status `pending`.
  - Returns PayFast URL (sandbox or production) with signature, return/cancel URLs, `notify_url` = ITN endpoint.
- **Return URL** (browser redirect): on `status=success`, updates stored payment to `complete`, then calls **transferCardOwnership** (if listingId/buyerId/sellerId present). Transfer:
  - Moves card from seller collection to buyer (or creates from listing).
  - Marks listing inactive.
  - Creates **order** with `buyerPudoLockerCode`, `buyerShippingAddress`, `shippingFeeZar: '100.00'`, `trackingStatus: 'deposited'`, etc.
  - Applies rewards (XP, store rings).
- **ITN** (`POST /payment/itn`): on `payment_status === 'COMPLETE'`, same: update store, then **transferCardOwnership** (using stored listingId/buyerId/sellerId and optional shipping). So order creation and Pudo on order already happen for **buy** flow.

### 2.3 What the app already has for “buy”

- Buyer email/name from session; Pudo from profile API; shipping form in PayFast modal; PayFast create → redirect → status poll; backend creates order with Pudo and tracking status; ITN as source of truth for completion.

---

## Part 3: What We Need for the Verify Flow

### 3.1 High-level verify flow (target)

1. User **requests verification** (from profile bulk modal **or** when adding a card in Add Card modal).
2. **User’s Pudo details** (and email/name) are required and passed — either from account (profile) or collected in the modal.
3. User pays a **flat R100** verification fee via **same payment system as Bid/Buy Now** (PayFast, same modal pattern).
4. After successful payment:
   - Backend has all info needed to **pass to the team to create a courier order** (user identity, Pudo locker/address, which cards, payment ref).
   - **User is notified** that they can submit the package at the Pudo: they have **e.g. 24 hours**, receive a **dropoff code**, and can see **tracking** in the app (reuse existing order/tracking concepts where possible).

### 3.2 List: Verify system (current vs required)

| Aspect | Current | Required |
|--------|--------|----------|
| **Vaulted requests (profile)** | Bulk modal: select cards → POST vaulting/bulk → creates pending requests, no payment | Keep; add step: after creating requests, open **payment modal** for R100 (one payment per batch or per card, TBD). Collect/confirm Pudo + user details if not already present. |
| **Vaulted requests (add card)** | Add card modal: optional “Request verification” checkbox → API creates collection + vaulted_request, no payment, no Pudo | Require/allow **Pudo details** (and ensure user email/name from DB). After add + vault request, open **same R100 payment flow** (or collect payment before creating request). |
| **Pudo on vault** | Not sent or stored with vaulted_requests | Store with vaulted request (or linked order): **pudoLockerCode**, **pudoAddress** (or full address), and **user id, email, name** for courier and notifications. |
| **Payment for verify** | None | **Flat R100**; use **same PayFast flow** as Bid/Buy Now: create-payment (with custom item_name e.g. “Verification fee”), store paymentId + vaulted_request ids + userId + Pudo; ITN/return → mark paid, create “verify order” or equivalent record for ops team. |
| **Courier / ops** | N/A | Backend (or post-ITN job) **aggregates PayFast + vault data** and exposes or sends to team: user name, email, Pudo locker/address, list of cards (vaulted_request ids/names), payment ref, so they can **create courier order**. |
| **User notification** | None | After payment: notify user (in-app and/or email): “You have **X hours (e.g. 24)** to drop off at Pudo. Your **dropoff code: XXXXX**.” (Code may come from courier/Pudo API later; app stores and displays it.) |
| **Tracking** | Orders have `trackingStatus` (order_placed, deposited, in_transit, delivered) | Reuse similar status for **verify** (e.g. “pending_dropoff” → “deposited” → “in_transit” → “verified”). Show in app so user knows status; rest can be handled in “current system” once we have the record. |

### 3.3 List: Buying process (reference for verify)

- **Bid / Buy Now** use the same **PayFastPayment** component and backend **create-payment → ITN/return → transferCardOwnership**.
- **Pudo and user details**: from **profile** (`/api/profile/user`: `pudoLockerCode`, `pudoAddress`, and user name/email from session); shipping form pre-filled, editable in modal.
- **PayFast data we get** (from create-payment store + ITN): `m_payment_id`, `amount_gross`, `item_name`, `email_address`, `name_first`, `name_last`; we already add `listingId`, `buyerId`, `sellerId`, `pudoLockerCode`, `shippingAddress` on our side.
- **For verify** we need the **same kind of payload** for the “team”: userId, email, name, Pudo locker + address, list of items (vaulted_request ids/card names), payment id, amount (R100).

### 3.4 Implementation checklist (verify)

- [ ] **Vaulted requests (schema/API)**  
  - Add/store **Pudo + user snapshot** with vaulted requests (or with a new “verify_order” table): e.g. `pudo_locker_code`, `pudo_address`, `user_email`, `user_name`, `payment_id`, `paid_at`, `dropoff_code`, `tracking_status`, `expires_at` (24h window).

- [ ] **Profile: bulk verify**  
  - After bulk vault request creation, open **PayFastPayment** with amount R100, item name e.g. “Verification fee (X cards)”, and pass **user’s Pudo details** (from profile) and email/name (from session).  
  - Backend: new payment type or `listingId`-style handling for “verify” — store `vaulted_request_ids` + userId + Pudo in payment store; on ITN/return create verify_order / update vaulted_requests and send payload to team.

- [ ] **Add Card modal**  
  - When “Request verification” is checked, **ensure user has Pudo and email/name** (pull from profile like product screen). Optionally show Pudo in modal (read-only or editable).  
  - On submit: create collection + vaulted_request as today; then open **same R100 PayFast flow** for this request (or batch with others). Pass Pudo and user details into payment.

- [ ] **PayFast / backend**  
  - Support “verify” payment type: no listingId/sellerId; instead `vaultedRequestIds` (or single id) + `userId` + Pudo + user details.  
  - On success: create **verify_order** (or equivalent) with all fields needed for courier; set **expires_at** (e.g. now + 24h); generate or reserve **dropoff_code** (if we have Pudo/courier API, else placeholder); set `tracking_status` (e.g. `pending_dropoff`).  
  - **Expose or push** to team: user name, email, Pudo locker/address, card names/ids, payment id, dropoff code, expiry.

- [ ] **User-facing**  
  - After payment success: show message “You have 24 hours to drop off at your Pudo. Your dropoff code: XXXXX.”  
  - Screen or section for “My verification” / “Verification status” showing pending dropoff / deposited / in transit / verified, with code and countdown if needed.

- [ ] **PayFast data for team**  
  - Ensure we persist and pass: `user_id`, `email`, `name` (first/last), `pudo_locker_code`, `pudo_address`, `payment_id`, `amount`, `item_name`, list of **card names / vaulted_request ids**, `dropoff_code`, `expires_at`, `tracking_status`. Rest of courier and tracking can be “current system” once this is in place.

---

## Part 4: Summary

- **Verify today**: Vaulted requests created from profile (bulk) and add-card (single); no payment, no Pudo on the request, no courier or user notification.
- **Buy today**: Bid/Buy Now → PayFastPayment with Pudo from profile, create-payment stores Pudo + buyer/seller/listingId; ITN/return runs transferCardOwnership and creates order with Pudo and tracking.
- **Verify target**: Same payment system (PayFast, same modal pattern), flat R100; require Pudo and user details on vault requests; after payment, backend has everything to pass to team for courier order and to show user a 24h window, dropoff code, and tracking in the app.

This document is the single place to understand both the verify system and the buying process and how they should align for the verify flow.
