# Database Setup Guide - Neon PostgreSQL

This guide explains how to connect your server to a Neon PostgreSQL database.

## 🔗 What is Neon?

Neon is a serverless PostgreSQL database that provides:
- Fully managed PostgreSQL
- Auto-scaling
- Free tier available
- Easy connection via connection strings

## 📋 Step 1: Get Your Neon Connection String

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project or select an existing one
3. Go to your project dashboard
4. Click on "Connection Details" or "Connection String"
5. Copy the connection string (it looks like):
   ```
   postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

## 🔧 Step 2: Add to Server Environment Variables

Add the connection string to your `server/.env` file:

```env
# Database Connection (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require

# Other existing environment variables...
ENVIRONMENT="PRODUCTION"
BYTESCALE_API_KEY=""
# ... etc
```

## ✅ Step 3: Verify Connection

After adding the `DATABASE_URL` to your `.env` file:

1. Restart your server:
   ```bash
   cd server
   npm run dev
   ```

2. You should see in the console:
   ```
   🔑 Environment check:
     GEMINI_API_KEY: AIzaSyCxxx...
     POKEDATA_API_KEY: ✅ SET
     DATABASE_URL: ✅ SET
   Server started on port 3050
   ✅ Database connected successfully
      Database time: 2024-01-15T10:30:00.000Z
   ```

## 📦 What Was Installed

The following packages were added to connect to PostgreSQL:
- `pg` - PostgreSQL client for Node.js
- `@types/pg` - TypeScript types for pg

## 🛠️ Using the Database

### Import the database utilities:

```typescript
import { query, getClient } from './db'

// Simple query
const result = await query('SELECT * FROM users WHERE id = $1', [userId])

// Using a client for transactions
const client = await getClient()
try {
  await client.query('BEGIN')
  await client.query('INSERT INTO users (name) VALUES ($1)', [name])
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
}
```

### Example: Create a users table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 Better Auth Database Setup

If you're planning to use Better Auth, you'll need to create the required tables. Better Auth typically requires tables for:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts
- `verification` - Email verification tokens

Better Auth provides migration scripts to create these tables automatically.

## 🚨 Troubleshooting

### Error: "Database connection failed"

1. **Check your connection string**: Make sure it's correct and complete
2. **Check network access**: Ensure your Neon project allows connections from your IP
3. **Check SSL**: Neon requires SSL, which is handled automatically if the connection string includes `sslmode=require`

### Error: "password authentication failed"

- Double-check your connection string credentials
- Make sure you copied the entire connection string including the password

### Error: "timeout"

- Check your internet connection
- Verify the Neon project is active (not paused)
- Check Neon's status page for any service issues

## 📝 Environment Variables Reference

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string

**Optional:**
- `PORT` - Server port (default: 3050)
- `ENVIRONMENT` - Environment name (PRODUCTION/DEVELOPMENT)

---

## 🎯 Next Steps

1. ✅ Add `DATABASE_URL` to `server/.env`
2. ✅ Restart server and verify connection
3. 📊 Create your database schema (tables for users, payments, etc.)
4. 🔐 Set up Better Auth (if needed)
