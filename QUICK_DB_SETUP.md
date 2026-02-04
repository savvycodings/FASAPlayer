# Quick Database Setup Guide

## 🚀 Quick Start

### Step 1: Generate Database Schema

```bash
cd server
npm run db:generate
```

This creates migration files based on your schema in `src/db/schema.ts`.

### Step 2: Push Schema to Database

```bash
npm run db:push
```

This applies the schema directly to your Neon PostgreSQL database and creates all tables.

## ✅ What Gets Created

After running `db:push`, you'll have:

1. **users** table - Comprehensive user profiles
2. **collections** table - User card collections
3. **stores** table - User store/seller profiles
4. **sessions** table - Authentication sessions

## 📋 Schema Details

### Users Table Includes:
- Authentication (email, password)
- Profile info (name, firstName, lastName, username)
- Contact (phone, location)
- Social (avatar, bio, website, twitter, instagram)
- Gamification (level, XP, portfolio value)
- Premium status and verification
- Preferences (JSON)
- Timestamps

### Collections Table Includes:
- User's cards, sealed products, slabs
- Condition, grade, value tracking
- Purchase history

### Stores Table Includes:
- Store name, description, images
- Verification levels (bronze, silver, gold, platinum, diamond)
- Sales stats, ratings, reviews

## 🔧 Available Commands

```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema directly to database (quick sync)
npm run db:push

# Run migrations (production approach)
npm run db:migrate

# Open database GUI
npm run db:studio
```

## ⚠️ Important Notes

1. **First Time Setup**: Use `db:push` to quickly create tables
2. **Schema Changes**: After modifying `src/db/schema.ts`, run `db:generate` then `db:push`
3. **Production**: Use migrations (`db:migrate`) instead of `db:push`

## 🎯 Next Steps After Setup

1. ✅ Run `npm run db:push` to create tables
2. ✅ Test sign-up/sign-in endpoints
3. ✅ Add password hashing (bcrypt)
4. ✅ Implement JWT tokens

---

**Schema File**: `server/src/db/schema.ts`
**Config**: `server/drizzle.config.ts`
