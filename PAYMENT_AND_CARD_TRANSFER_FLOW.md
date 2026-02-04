# Payment and Card Transfer Flow Documentation

## Overview

This document explains the complete flow of how Better Auth, PayFast payments, user profiles, card IDs, and ownership transfers work together in the GradeIt application.

---

## Table of Contents

1. [Better Auth Integration](#better-auth-integration)
2. [User ID Structure](#user-id-structure)
3. [Payment Flow](#payment-flow)
4. [Card Ownership Transfer](#card-ownership-transfer)
5. [Database Schema](#database-schema)
6. [Complete Flow Diagram](#complete-flow-diagram)
7. [Key Components](#key-components)

---

## Better Auth Integration

### What is Better Auth?

Better Auth is a full-stack authentication library that handles:
- User registration and login
- Session management
- User data storage
- Secure token-based authentication

### Better Auth Configuration

**Location:** `server/src/auth/auth.ts`

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,              // Maps to "users" table
      session: schema.sessions,        // Maps to "sessions" table
      account: schema.accounts,        // Maps to "accounts" table
      verification: schema.verificationTokens,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: baseURL,
  emailAndPassword: { enabled: true },
})
```

### Client-Side Auth Client

**Location:** `app/src/lib/auth-client.ts`

```typescript
export const authClient = createAuthClient({
  baseURL: getBackendUrl(),
  plugins: [
    expoClient({
      scheme: "saplayer",
      storagePrefix: "saplayer",
      storage: SecureStore, // Uses expo-secure-store for mobile
    })
  ],
})
```

### Getting User Session

**Frontend Example:** `app/src/screens/viewProfile.tsx`

```typescript
const session = await authClient.getSession()
const user = session?.data?.user

// User object structure:
{
  id: "u1RJ1eZQPhzpcB4LeXhNXjLbN4ZAVdya",  // String ID (Better Auth format)
  email: "kyletest@gmail.com",
  name: "Testingkyle",
  emailVerified: false,
  image: null,
  createdAt: "2026-01-23T21:44:34.862Z",
  updatedAt: "2026-01-23T21:44:34.862Z"
}
```

---

## User ID Structure

### Why String IDs?

Better Auth uses **string IDs** (not integers) for user identification. This is important because:

1. **Database Schema:** `server/src/db/schema.ts`
   ```typescript
   export const users = pgTable('users', {
     id: text('id').primaryKey(),  // TEXT, not serial/integer
     email: text('email').notNull().unique(),
     name: text('name').notNull(),
     // ... other fields
   })
   ```

2. **Store Relationship:** Stores reference users by string ID
   ```typescript
   export const stores = pgTable('stores', {
     id: serial('id').primaryKey(),           // Store ID is integer
     userId: text('user_id').references(() => users.id),  // User ID is string
     // ...
   })
   ```

3. **Collections:** User collections use string user IDs
   ```typescript
   export const collections = pgTable('collections', {
     id: serial('id').primaryKey(),           // Collection ID is integer
     userId: text('user_id').references(() => users.id),  // User ID is string
     name: varchar('name', { length: 255 }),
     // ...
   })
   ```

### ID Types Summary

| Entity | ID Type | Example |
|--------|---------|---------|
| Users | String | `"u1RJ1eZQPhzpcB4LeXhNXjLbN4ZAVdya"` |
| Stores | Integer | `5` |
| Store Listings | Integer | `8` |
| Collections | Integer | `10`, `13` |
| Orders | Integer | `1` |

---

## Payment Flow

### Step 1: User Initiates Purchase

**Location:** `app/src/screens/viewProfile.tsx`

When a user clicks "Buy" on a card listing:

```typescript
onBuyPress={async (listing) => {
  // 1. Get current user from Better Auth
  const session = await authClient.getSession()
  const user = session?.data?.user
  
  // 2. Validate user has email
  if (!user.email) {
    Alert.alert('Error', 'User email not found')
    return
  }
  
  // 3. Get store data (seller information)
  const sellerId = storeData.userId  // String ID from Better Auth
  
  // 4. Prepare payment data
  const paymentData = {
    listingId: listing.id,           // Integer
    buyerId: user.id,                 // String (Better Auth)
    sellerId: sellerId,               // String (Better Auth)
    userEmail: user.email,           // Email for PayFast
    amount: listing.price,
    itemName: listing.cardName,
  }
  
  // 5. Open payment modal
  setSelectedListing(listing)
  setIsPaymentModalVisible(true)
}
```

### Step 2: Create PayFast Payment

**Location:** `app/src/components/payment/PayFastPayment.tsx`

```typescript
const createPayment = async () => {
  // Validate all IDs are present
  if (!buyerId || !sellerId || !listingId || !userEmail) {
    throw new Error('Missing payment information')
  }
  
  // Send payment request to backend
  const response = await fetch(`${backendUrl}/payment/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      itemName,
      listingId,
      buyerId,      // String ID
      sellerId,     // String ID
      userEmail,
      userNameFirst,
      userNameLast,
    }),
  })
}
```

### Step 3: Backend Payment Creation

**Location:** `server/src/payment/payfastRouter.ts`

```typescript
router.post('/create-payment', async (req, res) => {
  const { amount, itemName, listingId, buyerId, sellerId, userEmail } = req.body
  
  // 1. Store payment metadata in memory (for later retrieval)
  const paymentId = `pf_${Date.now()}_${generateRandomString()}`
  
  paymentStatusStore.set(paymentId, {
    status: 'pending',
    listingId: parseInt(listingId),  // Convert to number
    buyerId: String(buyerId),         // Ensure string
    sellerId: String(sellerId),        // Ensure string
    amount,
    itemName,
  })
  
  // 2. Generate PayFast payment URL
  const paymentUrl = generatePayFastPaymentUrl({
    amount,
    itemName,
    userEmail,
    returnUrl: `${backendUrl}/payment/return?status=success&m_payment_id=${paymentId}`,
    notifyUrl: `${backendUrl}/payment/itn`,
    mPaymentId: paymentId,
  })
  
  // 3. Return payment URL to frontend
  res.json({ paymentUrl })
})
```

### Step 4: User Completes Payment on PayFast

User is redirected to PayFast, completes payment, and PayFast sends:
- **Return URL callback** (user returns to app)
- **ITN (Instant Transaction Notification)** (server-to-server)

---

## Card Ownership Transfer

### When Does Transfer Happen?

Card ownership transfer occurs in **two scenarios**:

1. **ITN Handler** (Primary) - Server-to-server notification from PayFast
2. **Return URL Handler** (Backup) - When user returns to app after payment

### Transfer Process

**Location:** `server/src/payment/payfastRouter.ts`

#### Step 1: Retrieve Payment Data

```typescript
// Get stored payment metadata
const storedPayment = paymentStatusStore.get(m_payment_id)

// Payment data includes:
{
  listingId: 8,                                    // Integer
  buyerId: "u1RJ1eZQPhzpcB4LeXhNXjLbN4ZAVdya",     // String
  sellerId: "SjEgazYCaGZPJaYSa1Elc3wPnhTJIyme",    // String
  amount: "500.00",
  itemName: "Test1",
}
```

#### Step 2: Find Listing

```typescript
const [listing] = await db.select()
  .from(storeListings)
  .where(eq(storeListings.id, listingId))
  .limit(1)

// Listing contains:
{
  id: 8,
  storeId: 5,              // Integer (references stores table)
  cardName: "Test1",
  price: "500.00",
  isActive: true,
}
```

#### Step 3: Find Buyer and Seller

```typescript
// Find buyer by ID (string)
const [buyer] = await db.select()
  .from(users)
  .where(eq(users.id, buyerId))  // buyerId is string
  .limit(1)

// Find seller by ID (string)
const [seller] = await db.select()
  .from(users)
  .where(eq(users.id, sellerId))  // sellerId is string
  .limit(1)
```

#### Step 4: Find Seller's Store

```typescript
const [sellerStore] = await db.select()
  .from(stores)
  .where(eq(stores.userId, sellerId))  // sellerId is string
  .limit(1)

// Store contains:
{
  id: 5,                                    // Integer
  userId: "SjEgazYCaGZPJaYSa1Elc3wPnhTJIyme",  // String (Better Auth ID)
  storeName: "Testingchalyn",
}
```

#### Step 5: Find Card in Seller's Collection

```typescript
// Find card by exact name match in seller's collection
const [sellerCard] = await db.select()
  .from(collections)
  .where(
    and(
      eq(collections.userId, sellerId),        // sellerId is string
      eq(collections.name, itemName),
      eq(collections.type, 'card')
    )
  )
  .limit(1)

// Card found:
{
  id: 10,                                    // Integer (collection ID)
  userId: "SjEgazYCaGZPJaYSa1Elc3wPnhTJIyme",  // String
  name: "Test1",
  type: "card",
}
```

#### Step 6: Add Card to Buyer's Collection

```typescript
// Insert card into buyer's collection
const [newCard] = await db.insert(collections)
  .values({
    userId: buyerId,        // String ID
    name: itemName,
    type: 'card',
    // Copy other card properties from seller's card
    image: sellerCard.image,
    estimatedValue: sellerCard.estimatedValue,
    // ...
  })
  .returning()

// New card created:
{
  id: 13,                                    // New integer ID
  userId: "u1RJ1eZQPhzpcB4LeXhNXjLbN4ZAVdya",  // Buyer's string ID
  name: "Test1",
}
```

#### Step 7: Remove Card from Seller's Collection

```typescript
// Delete card from seller's collection
await db.delete(collections)
  .where(eq(collections.id, sellerCard.id))  // sellerCard.id is integer

// Card removed: ID 10 deleted
```

#### Step 8: Mark Listing as Sold

```typescript
// Update listing to inactive
await db.update(storeListings)
  .set({ isActive: false })
  .where(eq(storeListings.id, listingId))

// Listing ID 8 now has isActive = false
```

#### Step 9: Create Order Record

```typescript
// Create order in orders table
const [order] = await db.insert(orders)
  .values({
    storeId: listing.storeId,        // Integer
    buyerId: buyerId,               // String
    itemName: itemName,
    price: amount,
    status: 'completed',
  })
  .returning()

// Order created:
{
  id: 1,                                    // Integer
  storeId: 5,                               // Integer
  buyerId: "u1RJ1eZQPhzpcB4LeXhNXjLbN4ZAVdya",  // String
  itemName: "Test1",
  price: "500.00",
  status: "completed",
}
```

#### Step 10: Update Store Statistics

```typescript
// Increment store's total sales
await db.update(stores)
  .set({
    totalSales: sql`${stores.totalSales} + 1`,
  })
  .where(eq(stores.id, listing.storeId))
```

---

## Database Schema

### Key Tables and Relationships

```
users (id: TEXT - Better Auth string ID)
  ├── stores (userId: TEXT → users.id)
  │     ├── store_listings (storeId: INTEGER → stores.id)
  │     └── orders (storeId: INTEGER → stores.id)
  └── collections (userId: TEXT → users.id)
```

### Important Relationships

1. **Users → Stores:** One-to-one (each user has one store)
   - `stores.userId` (TEXT) references `users.id` (TEXT)

2. **Stores → Listings:** One-to-many (store has many listings)
   - `store_listings.storeId` (INTEGER) references `stores.id` (INTEGER)

3. **Users → Collections:** One-to-many (user has many collection items)
   - `collections.userId` (TEXT) references `users.id` (TEXT)

4. **Stores → Orders:** One-to-many (store has many orders)
   - `orders.storeId` (INTEGER) references `stores.id` (INTEGER)
   - `orders.buyerId` (TEXT) references `users.id` (TEXT)

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER VIEWS STORE                                            │
│    - User browses another user's store                         │
│    - Sees listings with card names, prices, images            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. USER CLICKS "BUY"                                            │
│    - Frontend: viewProfile.tsx                                  │
│    - Gets current user from Better Auth session                │
│    - Validates: user.email, user.id, storeData.userId          │
│    - Opens PayFastPayment modal                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CREATE PAYMENT REQUEST                                       │
│    - Frontend: PayFastPayment.tsx                              │
│    - Sends to: POST /payment/create-payment                   │
│    - Data: { listingId, buyerId, sellerId, userEmail, ... }   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. BACKEND STORES PAYMENT METADATA                             │
│    - Backend: payfastRouter.ts                                  │
│    - Stores in memory: paymentStatusStore                      │
│    - Key: paymentId (e.g., "pf_1769206413523_lamawn65c")      │
│    - Value: { listingId, buyerId, sellerId, status: 'pending' }│
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. GENERATE PAYFAST PAYMENT URL                                │
│    - Backend generates PayFast payment form                    │
│    - Includes return_url and notify_url                        │
│    - Returns paymentUrl to frontend                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. USER COMPLETES PAYMENT ON PAYFAST                           │
│    - User redirected to PayFast                                │
│    - Enters payment details                                     │
│    - Completes payment                                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ 7A. ITN (Server Callback)│  │ 7B. RETURN URL          │
│    - PayFast → Backend    │  │    - User → App         │
│    - POST /payment/itn   │  │    - GET /payment/return│
│    - Server-to-server    │  │    - User sees success  │
└──────────────────────────┘  └──────────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. RETRIEVE PAYMENT METADATA                                   │
│    - Get from paymentStatusStore by paymentId                  │
│    - Extract: listingId, buyerId, sellerId                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. TRANSFER CARD OWNERSHIP                                     │
│    transferCardOwnership(listingId, buyerId, sellerId, ...)   │
│                                                                 │
│    a. Find listing by listingId                                │
│    b. Find buyer by buyerId (string)                            │
│    c. Find seller by sellerId (string)                         │
│    d. Find seller's store                                       │
│    e. Find card in seller's collection                         │
│    f. Add card to buyer's collection                            │
│    g. Remove card from seller's collection                     │
│    h. Mark listing as inactive (isActive = false)            │
│    i. Create order record                                       │
│    j. Update store statistics                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. RESULT                                                      │
│     ✅ Card in buyer's profile (collections table)             │
│     ✅ Card removed from seller's profile                       │
│     ✅ Listing no longer visible (isActive = false)            │
│     ✅ Order created in orders table                           │
│     ✅ Store sales count incremented                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### Frontend Components

1. **`app/src/screens/viewProfile.tsx`**
   - Displays store and listings
   - Handles "Buy" button click
   - Validates user data before payment
   - Opens payment modal

2. **`app/src/components/payment/PayFastPayment.tsx`**
   - Creates payment request
   - Opens PayFast payment page
   - Handles payment success/cancel
   - Validates all required IDs

3. **`app/src/lib/auth-client.ts`**
   - Better Auth client configuration
   - Handles session management
   - Provides user data

### Backend Components

1. **`server/src/payment/payfastRouter.ts`**
   - `/create-payment` - Creates payment and stores metadata
   - `/itn` - Handles PayFast ITN callback
   - `/return` - Handles user return from PayFast
   - `transferCardOwnership()` - Core transfer logic

2. **`server/src/auth/auth.ts`**
   - Better Auth server configuration
   - Database adapter setup
   - Session management

3. **`server/src/store/storeRouter.ts`**
   - Store CRUD operations
   - Listing management
   - Store data retrieval

### Database Tables

1. **`users`** - User accounts (Better Auth)
   - `id` (TEXT) - String ID from Better Auth
   - `email`, `name`, etc.

2. **`stores`** - User stores
   - `id` (INTEGER) - Store ID
   - `userId` (TEXT) - References users.id

3. **`store_listings`** - Items for sale
   - `id` (INTEGER) - Listing ID
   - `storeId` (INTEGER) - References stores.id
   - `isActive` (BOOLEAN) - Whether listing is active

4. **`collections`** - User card collections
   - `id` (INTEGER) - Collection item ID
   - `userId` (TEXT) - References users.id
   - `name` - Card name

5. **`orders`** - Purchase records
   - `id` (INTEGER) - Order ID
   - `storeId` (INTEGER) - References stores.id
   - `buyerId` (TEXT) - References users.id

---

## Important Notes

### ID Type Consistency

⚠️ **Critical:** Always ensure ID types match:
- **User IDs:** Always strings (Better Auth format)
- **Store IDs:** Always integers
- **Listing IDs:** Always integers
- **Collection IDs:** Always integers

### Payment Metadata Storage

The `paymentStatusStore` is an **in-memory Map** that temporarily stores payment metadata between:
1. Payment creation (frontend → backend)
2. Payment completion (PayFast → backend ITN/return)

This is necessary because PayFast doesn't include custom metadata in their callbacks.

### Fallback Mechanisms

If payment metadata is missing from `paymentStatusStore`, the system attempts:
1. Find listing by `item_name` from PayFast data
2. Find buyer by `email_address` from PayFast data
3. Find seller from listing's store

This ensures transfers work even if the initial payment creation had issues.

---

## Testing Checklist

✅ User can view store listings
✅ User can initiate payment with correct IDs
✅ Payment metadata is stored correctly
✅ ITN handler receives payment confirmation
✅ Card is transferred from seller to buyer
✅ Card is removed from seller's collection
✅ Listing is marked as inactive
✅ Order is created in database
✅ Store statistics are updated
✅ Buyer sees card in their profile
✅ Seller's store no longer shows sold listing

---

## Troubleshooting

### Issue: IDs are undefined

**Solution:** Ensure Better Auth session is loaded before opening payment modal
- Check `currentUser?.id` exists
- Check `storeData?.userId` exists
- Add validation before payment creation

### Issue: Card not transferring

**Solution:** Check ITN handler logs
- Verify payment metadata was stored
- Check if card exists in seller's collection
- Ensure buyer/seller IDs are correct string format

### Issue: Listing still visible after purchase

**Solution:** Check listing `isActive` status
- Verify `transferCardOwnership` marked listing as inactive
- Check store listings query filters by `isActive: true`

---

## Conclusion

The payment and card transfer system works by:

1. **Better Auth** provides user authentication and string-based user IDs
2. **PayFast** handles payment processing
3. **Payment metadata** is stored temporarily in memory
4. **ITN/Return handlers** trigger card ownership transfer
5. **Database operations** move cards between collections and update listings

All components work together to ensure secure, reliable card purchases and ownership transfers.
