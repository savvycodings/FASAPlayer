# Payment System, Card Transfer, and Sales Tracking Documentation

This document explains how the payment system, card ownership transfer, and sales tracking work in the SAPlayer backend.

## Table of Contents
1. [Payment Flow](#payment-flow)
2. [Card Ownership Transfer](#card-ownership-transfer)
3. [Sales Tracking](#sales-tracking)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)

---

## Payment Flow

### Overview
The payment system integrates with PayFast (South African payment gateway) to process card purchases. The flow involves:
1. Frontend initiates payment
2. Backend creates PayFast payment
3. User completes payment on PayFast
4. PayFast redirects back to our app
5. PayFast sends ITN (Instant Transaction Notification)
6. Card ownership is transferred
7. Order is created and sales are tracked

### Step-by-Step Flow

#### 1. Frontend Payment Initiation
**File**: `app/src/components/payment/PayFastPayment.tsx`

When a user wants to buy a card from a store:
```typescript
// User clicks "Buy" on a listing
// PayFastPayment component is opened with:
{
  amount: listing.price,
  itemName: listing.cardName,
  listingId: listing.id,
  buyerId: currentUser.id,
  sellerId: storeData.userId,
  // ... other payment details
}
```

The component sends a POST request to `/payment/create-payment`:
```typescript
const response = await fetch(`${backendUrl}/payment/create-payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount,
    itemName,
    listingId,
    buyerId,
    sellerId,
    userEmail,
    userNameFirst,
    userNameLast,
    // ... other fields
  })
})
```

#### 2. Backend Payment Creation
**File**: `server/src/payment/payfastRouter.ts` - `POST /payment/create-payment`

The backend:
1. Validates payment data
2. Generates a unique payment ID (`pf_timestamp_random`)
3. Builds PayFast payment parameters
4. Generates PayFast signature
5. **Stores payment metadata** in `paymentStatusStore`:
   ```typescript
   paymentStatusStore.set(paymentId, {
     status: 'pending',
     mPaymentId: paymentId,
     listingId: parseInt(listingId),
     buyerId: parseInt(buyerId),
     sellerId: parseInt(sellerId),
     timestamp: Date.now()
   })
   ```
6. Returns PayFast payment URL to frontend

#### 3. User Completes Payment
- User is redirected to PayFast payment page
- User enters payment details and completes payment
- PayFast processes the payment

#### 4. Payment Return (User Redirect)
**File**: `server/src/payment/payfastRouter.ts` - `GET /payment/return`

When PayFast redirects the user back:
- Query params: `status=success&m_payment_id=pf_xxx`
- Backend updates payment status to `complete`
- **Triggers card ownership transfer** if all data is available:
  ```typescript
  if (existingPayment.listingId && existingPayment.buyerId && existingPayment.sellerId) {
    await transferCardOwnership(
      existingPayment.listingId,
      existingPayment.buyerId,
      existingPayment.sellerId,
      listing.cardName,
      existingPayment.amount || listing.price.toString()
    )
  }
  ```
- Redirects user to app via deep link: `saplayer://payment/success`

#### 5. ITN (Instant Transaction Notification)
**File**: `server/src/payment/payfastRouter.ts` - `POST /payment/itn`

PayFast sends an ITN callback to verify payment:
- Verifies PayFast signature
- Updates payment status
- **Also triggers card ownership transfer** (backup in case return endpoint didn't process it)
- This ensures transfer happens even if user closes browser before redirect

---

## Card Ownership Transfer

### Overview
When a payment is successful, the card must be:
1. Removed from seller's collection
2. Added to buyer's collection
3. Listing marked as inactive (sold)
4. Order created for tracking

### Transfer Function
**File**: `server/src/payment/payfastRouter.ts` - `transferCardOwnership()`

```typescript
async function transferCardOwnership(
  listingId: number,
  buyerId: number,
  sellerId: number,
  itemName: string,
  amount: string
)
```

### Step-by-Step Process

#### 1. Find the Listing
```typescript
const [listing] = await db.select()
  .from(storeListings)
  .where(eq(storeListings.id, listingId))
  .limit(1)
```

#### 2. Verify Buyer and Seller
```typescript
const [buyer] = await db.select()
  .from(users)
  .where(eq(users.id, buyerId))
  .limit(1)

const [seller] = await db.select()
  .from(users)
  .where(eq(users.id, sellerId))
  .limit(1)
```

#### 3. Find Seller's Store
```typescript
const [sellerStore] = await db.select()
  .from(stores)
  .where(eq(stores.userId, sellerId))
  .limit(1)
```

#### 4. Find Card in Seller's Collection
The function tries multiple matching strategies:
- **Exact match**: `collections.name = listing.cardName`
- **Case-insensitive match**: `LOWER(TRIM(collections.name)) = LOWER(TRIM(listing.cardName))`
- **Item name fallback**: Matches against `itemName` from payment

```typescript
const [sellerCard] = await db.select()
  .from(collections)
  .where(
    and(
      eq(collections.userId, sellerId),
      eq(collections.name, listing.cardName)
    )
  )
  .limit(1)
```

#### 5. Transfer Card to Buyer

**If card found in seller's collection:**
```typescript
// Create new entry for buyer with all card data
const [newCard] = await db.insert(collections).values({
  userId: buyerId,
  type: sellerCard.type || 'card',
  name: listing.cardName, // Use listing.cardName for consistency
  description: sellerCard.description,
  image: sellerCard.image,
  cardId: sellerCard.cardId,
  set: sellerCard.set,
  condition: sellerCard.condition,
  grade: sellerCard.grade,
  estimatedValue: sellerCard.estimatedValue,
  purchasePrice: amount,
  purchaseDate: new Date(),
  notes: `Purchased from ${sellerStore.storeName || seller.name || 'seller'}`,
}).returning()

// Delete from seller's collection
await db.delete(collections)
  .where(eq(collections.id, sellerCard.id))
```

**If card NOT found in seller's collection:**
```typescript
// Create new entry based on listing data
const [newCard] = await db.insert(collections).values({
  userId: buyerId,
  type: 'card',
  name: listing.cardName,
  description: listing.description || null,
  image: listing.cardImage || null,
  purchasePrice: amount,
  purchaseDate: new Date(),
  notes: `Purchased from ${sellerStore.storeName || seller.name || 'seller'}`,
}).returning()
```

#### 6. Mark Listing as Sold
```typescript
await db.update(storeListings)
  .set({ isActive: false })
  .where(eq(storeListings.id, listingId))
```

#### 7. Create Order Record
```typescript
const orderPrice = amount ? parseFloat(amount.toString()) : parseFloat(listing.price.toString())
const orderPriceFormatted = isNaN(orderPrice) ? listing.price.toString() : orderPrice.toFixed(2)

const [newOrder] = await db.insert(orders).values({
  storeId: listing.storeId,
  buyerId: buyerId,
  itemName: listing.cardName,
  itemImage: listing.cardImage || null,
  price: orderPriceFormatted, // Formatted to 2 decimal places
  quantity: 1,
  status: 'completed',
  orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
}).returning()
```

#### 8. Update Store Sales Count
```typescript
await db.update(stores)
  .set({ 
    totalSales: sql`${stores.totalSales} + 1`,
    updatedAt: new Date(),
  })
  .where(eq(stores.id, listing.storeId))
```

---

## Sales Tracking

### Overview
Sales are tracked in two ways:
1. **Total Sales Count**: Incremented in `stores.totalSales` field
2. **Total Revenue**: Calculated from sum of all completed orders

### Total Sales Count
**Location**: `stores.totalSales` (integer field)

Updated during card transfer:
```typescript
await db.update(stores)
  .set({ 
    totalSales: sql`${stores.totalSales} + 1`,
    updatedAt: new Date(),
  })
  .where(eq(stores.id, listing.storeId))
```

### Total Revenue Calculation
**File**: `server/src/store/storeRouter.ts` - `GET /api/stores/:storeId`

Revenue is calculated dynamically from completed orders:
```typescript
const [salesResult] = await db.select({ 
  count: count(),
  totalRevenue: sql<number>`COALESCE(SUM(${orders.price}), 0)`
})
  .from(orders)
  .where(and(
    eq(orders.storeId, store.id),
    eq(orders.status, 'completed')
  ))

const salesCount = salesResult?.count || 0
const totalRevenue = parseFloat(salesResult?.totalRevenue?.toString() || '0')
```

**Why calculate dynamically?**
- More accurate (always reflects current state)
- Handles refunds/cancellations automatically
- No risk of data inconsistency

### Order Record
Each completed purchase creates an order record in the `orders` table:
- `storeId`: The seller's store
- `buyerId`: The buyer's user ID
- `itemName`: Card name
- `price`: Purchase price (formatted to 2 decimal places)
- `status`: 'completed'
- `orderNumber`: Unique order identifier

---

## API Endpoints

### Payment Endpoints

#### `POST /payment/create-payment`
Creates a PayFast payment and stores metadata.

**Request Body:**
```json
{
  "amount": 1000.00,
  "itemName": "Charizard ex",
  "listingId": 10,
  "buyerId": 5,
  "sellerId": 3,
  "userEmail": "buyer@example.com",
  "userNameFirst": "John",
  "userNameLast": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "paymentUrl": "https://sandbox.payfast.co.za/eng/process?...",
  "mPaymentId": "pf_1769117758848_4bi0po682"
}
```

#### `GET /payment/return`
Handles PayFast redirect after payment.

**Query Params:**
- `status`: 'success' or 'cancel'
- `m_payment_id`: Payment ID

**Actions:**
- Updates payment status
- Triggers card ownership transfer
- Redirects to app deep link

#### `POST /payment/itn`
Receives PayFast ITN (Instant Transaction Notification).

**Actions:**
- Verifies PayFast signature
- Updates payment status
- Triggers card ownership transfer (backup)

#### `GET /payment/status/:paymentId`
Checks payment status.

**Response:**
```json
{
  "success": true,
  "status": "complete",
  "mPaymentId": "pf_xxx",
  "amount": "1000.00"
}
```

### Store Endpoints

#### `GET /api/stores/:storeId`
Gets store data including sales statistics.

**Response:**
```json
{
  "success": true,
  "store": {
    "id": 1,
    "storeName": "My Store",
    "totalSales": 5,
    "salesCount": 5,
    "totalRevenue": 5000.00
  },
  "listings": [...],
  "user": {...}
}
```

---

## Database Schema

### Relevant Tables

#### `stores`
```sql
- id: serial PRIMARY KEY
- user_id: integer (references users.id)
- store_name: varchar(255)
- total_sales: integer DEFAULT 0  -- Incremented on each sale
- rating: decimal(3, 2)
- total_reviews: integer
```

#### `store_listings`
```sql
- id: serial PRIMARY KEY
- store_id: integer (references stores.id)
- card_name: varchar(255)
- card_image: text
- price: decimal(10, 2)
- is_active: boolean DEFAULT true  -- Set to false when sold
```

#### `collections`
```sql
- id: serial PRIMARY KEY
- user_id: integer (references users.id)
- type: varchar(50)  -- 'card', 'sealed', 'slab'
- name: varchar(255)
- image: text
- purchase_price: decimal(10, 2)
- purchase_date: timestamp
- notes: text
```

#### `orders`
```sql
- id: serial PRIMARY KEY
- store_id: integer (references stores.id)
- buyer_id: integer (references users.id)
- item_name: varchar(255)
- price: decimal(10, 2)  -- Used for revenue calculation
- quantity: integer DEFAULT 1
- status: varchar(50) DEFAULT 'processing'  -- 'completed' for sales
- order_number: varchar(100) UNIQUE
```

---

## Key Implementation Details

### Payment Metadata Storage
- Uses in-memory `Map` (`paymentStatusStore`) to store payment metadata
- Includes: `listingId`, `buyerId`, `sellerId` for card transfer
- Persists during payment flow (from creation to completion)

### Card Name Matching
- Uses `listing.cardName` consistently (not `itemName` from payment)
- Multiple matching strategies for robustness
- Case-insensitive matching as fallback

### Price Formatting
- PayFast sends `amount` as string
- Converts to number, then formats to 2 decimal places: `orderPrice.toFixed(2)`
- Ensures proper decimal field storage

### Error Handling
- Extensive logging at each step
- Fallback strategies if card not found in collection
- Order creation even if collection transfer has issues

### Dual Transfer Triggers
- Transfer happens in both `/payment/return` and `/payment/itn`
- Ensures transfer completes even if one endpoint fails
- Prevents duplicate transfers with proper checks

---

## Frontend Integration

### Payment Component
**File**: `app/src/components/payment/PayFastPayment.tsx`

**Usage:**
```typescript
<PayFastPayment
  visible={isPaymentModalVisible}
  amount={selectedListing.price}
  itemName={selectedListing.cardName}
  listingId={selectedListing.id}
  buyerId={currentUser.id}
  sellerId={storeData.userId}
  userEmail={currentUser.email}
  userNameFirst={currentUser.firstName}
  userNameLast={currentUser.lastName}
  onSuccess={(paymentData) => {
    // Refresh store data to show updated listings
    await fetchStoreData()
  }}
  onCancel={() => setIsPaymentModalVisible(false)}
/>
```

### Profile Refresh
**File**: `app/src/screens/profile.tsx`

Profile screen refreshes when navigated to:
```typescript
useFocusEffect(
  React.useCallback(() => {
    fetchUserProfile()
    fetchCollections()  // Shows newly purchased cards
  }, [])
)
```

---

## Testing Checklist

When testing the payment and transfer system:

1. ✅ Payment is created with correct metadata
2. ✅ Payment redirects to PayFast
3. ✅ Payment completes successfully
4. ✅ Card is removed from seller's collection
5. ✅ Card is added to buyer's collection
6. ✅ Listing is marked as inactive (sold)
7. ✅ Order is created with correct price
8. ✅ Store totalSales increments
9. ✅ Store revenue updates correctly
10. ✅ Profile screens refresh to show changes

---

## Troubleshooting

### Card Not Appearing in Buyer's Profile
- Check if `transferCardOwnership` was called (look for logs)
- Verify `buyerId` and `sellerId` are stored in payment metadata
- Check if card name matches exactly between listing and collection

### Revenue Not Updating
- Verify order is created with `status: 'completed'`
- Check order `price` field is properly formatted (2 decimal places)
- Ensure revenue calculation query includes the new order

### Listing Still Active After Purchase
- Check if listing `isActive` is set to `false`
- Verify transfer function completed successfully
- Check for errors in transfer logs

---

## Future Improvements

1. **Database-backed payment store**: Replace in-memory Map with database table
2. **Transaction support**: Wrap transfer in database transaction for atomicity
3. **Refund handling**: Add logic to reverse transfers on refunds
4. **Partial payments**: Support for payment plans/installments
5. **Analytics**: Track payment success rates, average order value, etc.

---

*Last Updated: January 2025*
