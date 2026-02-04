# Database Schema Documentation

## Overview

This project uses **Drizzle ORM** with **PostgreSQL** (Neon) for database management. The schema includes comprehensive user profiles, collections, stores, and sessions.

## Setup

### 1. Install Dependencies

Dependencies are already installed:
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` - Migration and introspection tools
- `pg` - PostgreSQL client
- `tsx` - TypeScript execution for migrations

### 2. Environment Variables

Make sure your `server/.env` has:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### 3. Generate Migrations

```bash
cd server
npm run db:generate
```

This will:
- Read your schema from `src/db/schema.ts`
- Generate migration files in `src/db/migrations/`
- Create SQL files that can be applied to your database

### 4. Push Schema to Database

```bash
npm run db:push
```

This will:
- Apply the schema directly to your database
- Create all tables, columns, indexes, and constraints
- **Note**: This is a quick way to sync schema, but for production use migrations

### 5. Run Migrations (Alternative to push)

```bash
npm run db:migrate
```

This will:
- Run all pending migrations from `src/db/migrations/`
- Track migration state in the database
- Better for production environments

## Database Schema

### Users Table

Comprehensive user profile with authentication and profile information.

**Fields:**
- `id` - Primary key (serial)
- `email` - Unique email address
- `password` - Hashed password (should use bcrypt in production)
- `name` - Full name
- `firstName` - First name
- `lastName` - Last name
- `username` - Unique username
- `phone` - Phone number
- `avatar` - Profile image URL
- `bio` - User biography
- `location` - User location
- `dateOfBirth` - Date of birth
- `isPremium` - Premium membership status
- `isVerified` - Account verification status
- `level` - User level (gamification)
- `currentXP` - Current experience points
- `xpToNextLevel` - XP needed for next level
- `portfolioValue` - Total collection value
- `website` - Personal website URL
- `twitter` - Twitter handle
- `instagram` - Instagram handle
- `preferences` - JSON object for user preferences
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp
- `lastLoginAt` - Last login timestamp
- `emailVerifiedAt` - Email verification timestamp

### Collections Table

User's card collection items (cards, sealed products, slabs).

**Fields:**
- `id` - Primary key
- `userId` - Foreign key to users
- `type` - Type of item ('card', 'sealed', 'slab')
- `name` - Item name
- `description` - Item description
- `image` - Item image URL
- `cardId` - Pokedata card ID (if applicable)
- `condition` - Card condition
- `grade` - PSA/BGS grade (if slabbed)
- `estimatedValue` - Current estimated value
- `purchasePrice` - Purchase price
- `purchaseDate` - When item was purchased
- `notes` - Additional notes
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Stores Table

User's store/seller profile information.

**Fields:**
- `id` - Primary key
- `userId` - Foreign key to users (one-to-one)
- `storeName` - Store name
- `description` - Store description
- `bannerUrl` - Store banner image URL
- `profileImage` - Store profile image URL
- `verificationLevel` - Seller verification level
- `totalSales` - Total number of sales
- `rating` - Average rating
- `totalReviews` - Number of reviews
- `isActive` - Store active status
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Sessions Table

User authentication sessions.

**Fields:**
- `id` - Primary key
- `userId` - Foreign key to users
- `token` - Session token
- `expiresAt` - Token expiration timestamp
- `createdAt` - Creation timestamp

## Relations

- **Users** → **Collections** (one-to-many)
- **Users** → **Store** (one-to-one)
- **Users** → **Sessions** (one-to-many)

## Usage Examples

### Using Drizzle in Your Code

```typescript
import { db } from './db'
import { users, collections } from './db/schema'
import { eq } from 'drizzle-orm'

// Insert a user
const newUser = await db.insert(users).values({
  email: 'user@example.com',
  password: 'hashed_password',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
}).returning()

// Query users
const allUsers = await db.select().from(users)

// Query with conditions
const user = await db.select().from(users).where(eq(users.email, 'user@example.com'))

// Update user
await db.update(users)
  .set({ name: 'Jane Doe' })
  .where(eq(users.id, 1))

// Insert collection item
await db.insert(collections).values({
  userId: 1,
  type: 'card',
  name: 'Charizard Base Set',
  condition: 'near_mint',
  estimatedValue: '150.00',
})
```

## Available Commands

### `npm run db:generate`
Generate migration files from schema changes.

### `npm run db:push`
Push schema directly to database (development only).

### `npm run db:studio`
Open Drizzle Studio (database GUI) in browser.

### `npm run db:migrate`
Run pending migrations.

## Migration Workflow

1. **Make changes** to `src/db/schema.ts`
2. **Generate migrations**: `npm run db:generate`
3. **Review** generated SQL in `src/db/migrations/`
4. **Apply migrations**: `npm run db:migrate` or `npm run db:push`

## Production Considerations

1. **Always use migrations** in production, not `db:push`
2. **Hash passwords** with bcrypt before storing
3. **Use JWT tokens** for sessions, not simple strings
4. **Add indexes** for frequently queried fields
5. **Set up backups** for your Neon database
6. **Use connection pooling** (already configured)

## Next Steps

1. ✅ Run `npm run db:generate` to create initial migrations
2. ✅ Run `npm run db:push` to create tables in database
3. ✅ Update auth router to use Drizzle instead of raw SQL
4. ✅ Add password hashing with bcrypt
5. ✅ Implement JWT tokens for sessions

---

**Schema File**: `server/src/db/schema.ts`
**Drizzle Config**: `server/drizzle.config.ts`
**Migration Script**: `server/src/db/migrate.ts`
