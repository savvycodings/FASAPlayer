# Fix Sign-Up 500 Error

## Problem
Getting `500 Internal Server Error` when trying to sign up.

## Most Likely Cause
The database tables haven't been created yet. You need to push the schema to your database.

## Solution

### Step 1: Make sure DATABASE_URL is set

Check your `server/.env` file has:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### Step 2: Create the database tables

Run these commands in the `server` directory:

```bash
cd server

# Generate migration files (optional, but good practice)
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push
```

### Step 3: Verify tables were created

You should see output like:
```
✅ Pushed schema to database
```

Or check your Neon console to see if the tables exist:
- `users`
- `collections`
- `stores`
- `sessions`

### Step 4: Restart your server

```bash
npm run dev
```

### Step 5: Try signing up again

The sign-up should now work!

## Alternative: Check Server Logs

If you still get errors, check your server console for the actual error message. The updated error handling will now tell you if tables are missing.

## Common Errors

### "relation 'users' does not exist"
→ Run `npm run db:push` to create tables

### "DATABASE_URL not set"
→ Add `DATABASE_URL` to `server/.env`

### "Connection refused"
→ Check your Neon database is active and the connection string is correct

---

**Quick Fix:**
```bash
cd server
npm run db:push
```

Then restart your server and try again!
