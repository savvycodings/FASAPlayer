# Quick Start Guide - GradeIt Setup

This guide provides a quick overview of how everything connects and what you need to do next.

## 🎯 Current Situation

You have:
- ✅ React Native Expo app (`/app`)
- ✅ Express.js server (`/server`)
- ✅ Database packages installed (pg)
- ✅ Database connection module created
- ❌ Database connection string not configured
- ❌ Better Auth not installed yet

## 🚀 Next Steps

### 1. Connect Database (Required First)

**What to do:**
1. Get your Neon PostgreSQL connection string from [Neon Console](https://console.neon.tech)
2. Add it to `server/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. Restart your server:
   ```bash
   cd server
   npm run dev
   ```
4. Look for: `✅ Database connected successfully` in the console

**See:** `DATABASE_SETUP.md` for detailed instructions

### 2. Configure Better Auth (After Database)

**What to do:**
1. Add Better Auth env vars to `server/.env`:
   ```env
   BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
   BETTER_AUTH_URL=http://localhost:3050
   ```

2. Add Better Auth env var to `app/.env`:
   ```env
   EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3050
   ```

**Important:** `BETTER_AUTH_URL` should point to your **server** (port 3050), not your app (port 8081).

**See:** `BETTER_AUTH_SETUP.md` for detailed instructions

## 📋 Complete Environment Variables Reference

### Server (`server/.env`)

```env
# Environment
ENVIRONMENT="PRODUCTION"

# Database (REQUIRED - Get from Neon Console)
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# Better Auth (Add when setting up auth)
BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
BETTER_AUTH_URL=http://localhost:3050

# API Keys
BYTESCALE_API_KEY=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
POKEDATA_API_KEY=eyJ0eXAi...
COHERE_API_KEY=""
FAL_API_KEY=""
REPLICATE_KEY=""
GEMINI_API_KEY=AIzaSy...
GOOGLE_VISION_API=AIzaSy...
```

### App (`app/.env`)

```env
# Environment Selection
EXPO_PUBLIC_ENV="DEVELOPMENT"

# API URLs
EXPO_PUBLIC_DEV_API_URL="http://localhost:3050"
EXPO_PUBLIC_PROD_API_URL="https://staging.example.com"

# Better Auth (Add when setting up auth)
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3050

# API Keys (if needed in app)
POKEDATA_API_KEY=eyJ0eXAi...
GEMINI_API_KEY=AIzaSy...
```

## 🔗 How Everything Connects

```
┌─────────────────────────────────────┐
│  React Native Expo App              │
│  Running on: http://localhost:8081  │
│                                     │
│  Reads: app/.env                    │
│  Uses: EXPO_PUBLIC_ENV to choose    │
│        between DEV/PROD API URLs    │
└──────────────┬──────────────────────┘
               │
               │ HTTP Requests
               │ (using DOMAIN constant)
               │
               ▼
┌─────────────────────────────────────┐
│  Express.js Server                  │
│  Running on: http://localhost:3050  │
│                                     │
│  Reads: server/.env                 │
│  Provides: /chat, /images, /files,  │
│           /pokedata, /payment       │
│                                     │
│  Better Auth: /api/auth/*           │
│  (when configured)                  │
└──────────────┬──────────────────────┘
               │
               │ SQL Queries (pg)
               │
               ▼
┌─────────────────────────────────────┐
│  Neon PostgreSQL Database           │
│  (Cloud)                            │
│                                     │
│  Stores:                            │
│  - Users                            │
│  - Sessions                         │
│  - Payments                         │
│  - Application data                 │
└─────────────────────────────────────┘
```

## 🎓 Key Concepts

### Environment-Based API URLs

The app uses `EXPO_PUBLIC_ENV` to decide which API URL to use:

**Development:**
- `EXPO_PUBLIC_ENV="DEVELOPMENT"` → Uses `EXPO_PUBLIC_DEV_API_URL` → `http://localhost:3050`

**Production:**
- `EXPO_PUBLIC_ENV="PRODUCTION"` → Uses `EXPO_PUBLIC_PROD_API_URL` → `https://staging.example.com`

### Why Two Different Ports?

- **Port 8081**: Expo dev server (runs your React Native app)
- **Port 3050**: Your Express backend (handles API requests)

Your app makes HTTP requests from port 8081 **to** port 3050.

### Better Auth URL Configuration

**Common Confusion:** Your app runs on port 8081, but Better Auth should point to port 3050 (the server).

**Why?** Because Better Auth endpoints (`/api/auth/*`) are served by your Express server, not by Expo.

## 📚 Documentation Files

- `ARCHITECTURE.md` - Complete architecture explanation
- `DATABASE_SETUP.md` - How to connect Neon PostgreSQL
- `BETTER_AUTH_SETUP.md` - How to set up Better Auth
- `QUICK_START.md` - This file

## ✅ Verification Checklist

After setup, verify:

- [ ] Server starts without errors
- [ ] Database connection successful (see ✅ in console)
- [ ] App can make requests to server
- [ ] Environment variables are loaded correctly

## 🆘 Troubleshooting

### "Database connection failed"
→ Check `DATABASE_URL` in `server/.env` is correct and complete

### "Cannot connect to backend server"
→ Make sure server is running on port 3050
→ For mobile: Update `backendIp` in `app/app.json` with your computer's IP

### Better Auth not working
→ Make sure `BETTER_AUTH_URL` points to server (3050), not app (8081)
→ Verify Better Auth routes are mounted on server

---

## 🎯 You're Ready!

1. Add `DATABASE_URL` to `server/.env`
2. Restart server and verify connection
3. Set up Better Auth when ready (see `BETTER_AUTH_SETUP.md`)

Good luck! 🚀
