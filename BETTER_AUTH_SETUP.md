# Better Auth Setup Guide

This guide explains how to configure Better Auth for your React Native Expo app.

## 📋 Overview

Better Auth is an authentication library that works with:
- React Native/Expo apps
- PostgreSQL databases (like Neon)
- Multiple authentication providers

## 🔧 Configuration

### Server-Side Configuration

Add to `server/.env`:

```env
# Better Auth Configuration
BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
BETTER_AUTH_URL=http://localhost:3050
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Important Notes:**
- `BETTER_AUTH_URL` should point to your **server** (port 3050), not the app (port 8081)
- `BETTER_AUTH_SECRET` is used to sign tokens - keep it secure!
- `DATABASE_URL` is required for Better Auth to store user data

### App-Side Configuration

Add to `app/.env`:

```env
# Better Auth Configuration
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3050
```

**Important Notes:**
- This should match the server URL where Better Auth endpoints are hosted
- For production, change to your production server URL

## 📦 Installation

### Server

```bash
cd server
npm install better-auth
```

### App

```bash
cd app
npm install better-auth
```

## 🏗️ Architecture

```
┌─────────────────────┐
│   Expo App          │
│   (port 8081)       │
│                     │
│  Uses:              │
│  EXPO_PUBLIC_       │
│  BETTER_AUTH_URL    │
└──────────┬──────────┘
           │
           │ Auth Requests
           │
           ▼
┌─────────────────────┐
│   Express Server    │
│   (port 3050)       │
│                     │
│  Better Auth API:   │
│  /api/auth/*        │
│                     │
│  Uses:              │
│  BETTER_AUTH_URL    │
│  BETTER_AUTH_SECRET │
└──────────┬──────────┘
           │
           │ SQL Queries
           │
           ▼
┌─────────────────────┐
│   Neon Database     │
│                     │
│  Tables:            │
│  - user             │
│  - session          │
│  - account          │
│  - verification     │
└─────────────────────┘
```

## 🔑 URL Configuration Explained

### Why `BETTER_AUTH_URL=http://localhost:3050`?

Even though your Expo app runs on `http://localhost:8081`, Better Auth endpoints are served by your Express server on port 3050.

**Better Auth endpoints will be at:**
- `http://localhost:3050/api/auth/signin`
- `http://localhost:3050/api/auth/signup`
- `http://localhost:3050/api/auth/session`
- etc.

**Your app (port 8081) makes requests to the server (port 3050) for authentication.**

## 📝 Example Server Setup

After installing Better Auth, you would set it up like this in `server/src/index.ts`:

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
// or
// import { drizzleAdapter } from "better-auth/adapters/drizzle"

const auth = betterAuth({
  database: prismaAdapter(prisma), // or drizzleAdapter(drizzle)
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
})

// Mount Better Auth routes
app.use("/api/auth", auth.handler)
```

## 📝 Example App Setup

In your React Native app:

```typescript
import { createAuthClient } from "better-auth/react"

const auth = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_URL, // http://localhost:3050
})

// Use in your components
const { data: session } = auth.useSession()
```

## 🚀 Development vs Production

### Development
- **Server**: `http://localhost:3050`
- **App**: `http://localhost:8081` (or Expo Go on mobile)
- **Database**: Neon development database

### Production
- **Server**: `https://your-production-server.com`
- **App**: Production build
- **Database**: Neon production database

**Update environment variables accordingly:**
- `BETTER_AUTH_URL=https://your-production-server.com`
- `EXPO_PUBLIC_BETTER_AUTH_URL=https://your-production-server.com`

## ✅ Current Status

**Not yet implemented** - You'll need to:

1. Install Better Auth packages
2. Set up Better Auth on the server
3. Create database schema (Better Auth provides migrations)
4. Configure Better Auth client in the app
5. Add authentication routes to the server

## 📚 Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth with React Native](https://www.better-auth.com/docs/guides/react-native)
- [Better Auth with PostgreSQL](https://www.better-auth.com/docs/guides/database)

---

## 🔐 Security Notes

- **Never commit** `BETTER_AUTH_SECRET` to git
- Use different secrets for development and production
- Keep your `.env` files in `.gitignore`
- Rotate secrets periodically
