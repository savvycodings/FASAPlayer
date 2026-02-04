# Ngrok and Hosting Setup Guide

## Overview

This guide explains how ngrok is configured for mobile development with Better Auth, PayFast payments, and the Expo app. Ngrok creates a secure tunnel from the internet to your local development server, allowing your mobile app (running on a physical device) to connect to your backend.

---

## Table of Contents

1. [Why Ngrok?](#why-ngrok)
2. [Complete Setup Process](#complete-setup-process)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [How It Works](#how-it-works)
5. [URL Resolution Priority](#url-resolution-priority)
6. [CORS Configuration](#cors-configuration)
7. [Better Auth Integration](#better-auth-integration)
8. [Daily Workflow](#daily-workflow)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## Why Ngrok?

### The Problem

When developing a mobile app with Expo Go:
- Your backend runs on `localhost:3050` (only accessible on your computer)
- Your phone is on a different device (can't access `localhost`)
- You need a public URL that both your phone and PayFast can reach

### The Solution: Ngrok

Ngrok creates a **public HTTPS URL** that tunnels to your local server:
```
https://carylon-coconscious-fatally.ngrok-free.dev → http://localhost:3050
```

**Benefits:**
- ✅ Works from any device (phone, tablet, etc.)
- ✅ HTTPS (required for Better Auth and PayFast)
- ✅ No firewall configuration needed
- ✅ Free tier available
- ✅ Easy to set up

---

## Complete Setup Process

### Step 1: Sign Up for Ngrok (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Create a free account
3. Verify your email

### Step 2: Get Your Authtoken

1. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`)

### Step 3: Configure Ngrok on Your Machine

**Using npx (Recommended - No Installation Needed):**
```bash
cd server
npx ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

**Or if you have ngrok installed globally:**
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

This stores your authtoken in `~/.ngrok2/ngrok.yml` (you only need to do this once).

### Step 4: Start Your Backend Server

```bash
cd server
npm run dev
```

Your server should be running on `http://localhost:3050`

### Step 5: Start Ngrok Tunnel

**In a new terminal:**
```bash
cd server
npm run ngrok
```

You'll see output like:
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://carylon-coconscious-fatally.ngrok-free.dev -> http://localhost:3050

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Important:** Copy the HTTPS URL (e.g., `https://carylon-coconscious-fatally.ngrok-free.dev`)

### Step 6: Update Environment Variables

**Update `server/.env`:**
```env
BETTER_AUTH_URL=https://carylon-coconscious-fatally.ngrok-free.dev
```

**Update `app/.env`:**
```env
EXPO_PUBLIC_BACKEND_URL=https://carylon-coconscious-fatally.ngrok-free.dev
```

### Step 7: Restart Everything

**Restart your backend server:**
```bash
# Stop the current server (Ctrl+C)
cd server
npm run dev
```

**Restart Expo:**
```bash
# Stop Expo (Ctrl+C)
cd app
npm run start --clear
```

**Keep ngrok running** (don't restart it unless the URL changes)

---

## Environment Variables Configuration

### Server Environment Variables (`server/.env`)

```env
# Database
DATABASE_URL=postgresql://user:pass@host/dbname

# Better Auth Configuration
BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
BETTER_AUTH_URL=https://carylon-coconscious-fatally.ngrok-free.dev

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# API Keys
GEMINI_API_KEY=your_key
POKEDATA_API_KEY=your_key
```

**Key Variables:**
- `BETTER_AUTH_URL`: The public URL (ngrok) that Better Auth uses for callbacks and redirects
- `BETTER_AUTH_SECRET`: Secret key for signing tokens (keep secure!)

### App Environment Variables (`app/.env`)

```env
# Environment
EXPO_PUBLIC_ENV="DEVELOPMENT"

# Backend URL (ngrok URL for mobile, localhost for web)
EXPO_PUBLIC_BACKEND_URL="https://carylon-coconscious-fatally.ngrok-free.dev"

# Better Auth URL (optional, falls back to EXPO_PUBLIC_BACKEND_URL)
EXPO_PUBLIC_BETTER_AUTH_URL="https://carylon-coconscious-fatally.ngrok-free.dev"

# API Keys (if needed in frontend)
POKEDATA_API_KEY=your_key
GEMINI_API_KEY=your_key
```

**Key Variables:**
- `EXPO_PUBLIC_BACKEND_URL`: Used by all API calls (PayFast, store, profile, etc.)
- `EXPO_PUBLIC_BETTER_AUTH_URL`: Optional, Better Auth will use `EXPO_PUBLIC_BACKEND_URL` if not set

---

## How It Works

### URL Resolution Flow

#### Frontend (App) - `app/src/lib/auth-client.ts`

```typescript
const getBackendUrl = () => {
  // 1. Check EXPO_PUBLIC_BACKEND_URL first (ngrok URL)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL
  }
  
  // 2. Check Better Auth specific env var
  if (process.env.EXPO_PUBLIC_BETTER_AUTH_URL) {
    return process.env.EXPO_PUBLIC_BETTER_AUTH_URL
  }
  
  // 3. For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:3050'
  }
  
  // 4. For mobile, use IP from app.json
  const devIp = Constants.expoConfig?.extra?.backendIp || '192.168.1.9'
  return `http://${devIp}:3050`
}
```

**Priority:**
1. `EXPO_PUBLIC_BACKEND_URL` (ngrok URL) ← **Used when set**
2. `EXPO_PUBLIC_BETTER_AUTH_URL` (fallback)
3. `localhost:3050` (web only)
4. IP address from `app.json` (mobile fallback)

#### Backend (Server) - `server/src/auth/auth.ts`

```typescript
const getBetterAuthUrl = () => {
  // If BETTER_AUTH_URL is set (ngrok URL), use it
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }
  
  // Default to localhost for development
  return "http://localhost:3050"
}
```

**Priority:**
1. `BETTER_AUTH_URL` (ngrok URL) ← **Used when set**
2. `localhost:3050` (fallback)

### Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Mobile App (Expo Go)                                         │
│ Running on: Physical Device                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS Request
                            │ EXPO_PUBLIC_BACKEND_URL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Ngrok Tunnel                                                 │
│ https://carylon-coconscious-fatally.ngrok-free.dev          │
│                                                              │
│  • Receives HTTPS request from internet                      │
│  • Forwards to localhost:3050                                │
│  • Returns response back to device                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Request
                            │ localhost:3050
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Your Local Server                                            │
│ Running on: http://localhost:3050                            │
│                                                              │
│  • Express server                                            │
│  • Better Auth handler                                       │
│  • PayFast payment endpoints                                 │
│  • Store/profile APIs                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## URL Resolution Priority

### Frontend URL Resolution

**Location:** `app/src/lib/auth-client.ts`, `app/src/components/payment/PayFastPayment.tsx`

```typescript
// Priority order:
1. EXPO_PUBLIC_BACKEND_URL          // ← Set this to ngrok URL
2. EXPO_PUBLIC_BETTER_AUTH_URL       // ← Fallback
3. localhost:3050                    // ← Web only
4. IP from app.json                  // ← Mobile fallback (not recommended)
```

### Backend URL Resolution

**Location:** `server/src/auth/auth.ts`

```typescript
// Priority order:
1. BETTER_AUTH_URL                   // ← Set this to ngrok URL
2. localhost:3050                     // ← Fallback
```

---

## CORS Configuration

### Why CORS Matters

CORS (Cross-Origin Resource Sharing) controls which origins can access your API. Since your app runs on a different origin than your server, CORS must be configured correctly.

### Server CORS Setup

**Location:** `server/src/index.ts`

```typescript
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true)
    }
    
    // Allow localhost origins
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true)
    }
    
    // Allow Expo Go origins
    if (origin.startsWith('exp://')) {
      return callback(null, true)
    }
    
    // Allow ngrok origins ← Important for mobile!
    if (origin.includes('ngrok-free.app') || origin.includes('ngrok.io')) {
      return callback(null, true)
    }
    
    // In development, be permissive
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true)
    }
    
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true, // Required for Better Auth cookies
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'ngrok-skip-browser-warning', // ← Bypasses ngrok warning page
  ],
}))
```

**Key Points:**
- ✅ Allows ngrok origins automatically
- ✅ Allows Expo Go (`exp://`) origins
- ✅ Allows `credentials: true` (required for Better Auth cookies)
- ✅ Includes `ngrok-skip-browser-warning` header (bypasses ngrok warning page)

### Ngrok Warning Page Bypass

Ngrok free tier shows a warning page before accessing your site. To bypass it:

**Frontend:** Add header to all requests
```typescript
headers: {
  'ngrok-skip-browser-warning': 'true',
}
```

**Backend:** Allow this header in CORS (already configured)

---

## Better Auth Integration

### Trusted Origins

**Location:** `server/src/auth/auth.ts`

Better Auth needs to know which origins to trust for OAuth redirects and session management.

```typescript
trustedOrigins: (request) => {
  const origins = ["saplayer://"] // Your app scheme from app.json
  
  // In development, allow all exp:// origins
  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    origins.push(
      "exp://",                      // Trust all Expo URLs
      "exp://**",                    // Wildcard matching
      "exp://192.168.*.*:*/**",      // IP range
      "exp://*:*"                    // Any exp:// URL
    )
    
    // If we have a request, also allow its origin
    if (request?.headers?.origin) {
      const origin = request.headers.origin as string
      if (origin.startsWith('exp://')) {
        origins.push(origin)
      }
    }
  }
  
  return origins
}
```

**What This Does:**
- Allows `saplayer://` deep links (your app scheme)
- Allows all `exp://` origins in development (Expo Go)
- Dynamically adds request origin if it's an Expo URL

### Base URL Configuration

Better Auth uses `baseURL` for:
- Generating callback URLs
- Creating session tokens
- OAuth redirects

```typescript
const baseURL = getBetterAuthUrl() // Gets from BETTER_AUTH_URL env var

export const auth = betterAuth({
  baseURL: baseURL, // e.g., "https://carylon-coconscious-fatally.ngrok-free.dev"
  // ...
})
```

**Important:** This must match the ngrok URL so Better Auth generates correct callback URLs.

---

## Daily Workflow

### Starting Development

1. **Start Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   Wait for: `Server started on port 3050`

2. **Start Ngrok Tunnel:**
   ```bash
   cd server
   npm run ngrok
   ```
   Copy the HTTPS URL (e.g., `https://carylon-coconscious-fatally.ngrok-free.dev`)

3. **Update Environment Variables:**
   - Update `server/.env`: `BETTER_AUTH_URL=<ngrok-url>`
   - Update `app/.env`: `EXPO_PUBLIC_BACKEND_URL=<ngrok-url>`

4. **Restart Backend:**
   ```bash
   # Stop server (Ctrl+C)
   cd server
   npm run dev
   ```

5. **Start Expo:**
   ```bash
   cd app
   npm run start --clear
   ```

6. **Open App on Device:**
   - Scan QR code with Expo Go
   - App should connect to backend via ngrok

### When Ngrok URL Changes

**Free ngrok URLs change when you restart ngrok.** If the URL changes:

1. Copy the new ngrok URL
2. Update `server/.env`: `BETTER_AUTH_URL=<new-url>`
3. Update `app/.env`: `EXPO_PUBLIC_BACKEND_URL=<new-url>`
4. Restart backend server
5. Restart Expo (or reload app)

**Tip:** Use a paid ngrok account for a fixed domain, or use `ngrokfixed` script if you have a reserved domain.

---

## Troubleshooting

### Issue: "Cannot connect to backend server"

**Symptoms:**
- App shows connection error
- API calls fail
- Better Auth login doesn't work

**Solutions:**
1. **Check ngrok is running:**
   ```bash
   # Should see "Forwarding https://... -> http://localhost:3050"
   ```

2. **Check backend server is running:**
   ```bash
   # Should see "Server started on port 3050"
   ```

3. **Verify environment variables:**
   - `server/.env`: `BETTER_AUTH_URL` matches ngrok URL
   - `app/.env`: `EXPO_PUBLIC_BACKEND_URL` matches ngrok URL

4. **Check ngrok URL is HTTPS:**
   - Must be `https://` not `http://`
   - Better Auth and PayFast require HTTPS

5. **Restart everything:**
   - Stop ngrok, server, and Expo
   - Start in order: server → ngrok → Expo

### Issue: "CORS error" or "Not allowed by CORS"

**Symptoms:**
- Browser console shows CORS error
- Requests fail with CORS message

**Solutions:**
1. **Check CORS configuration** in `server/src/index.ts`
2. **Verify ngrok origin is allowed:**
   ```typescript
   if (origin.includes('ngrok-free.app') || origin.includes('ngrok.io')) {
     return callback(null, true)
   }
   ```
3. **Check `credentials: true`** is set in CORS config
4. **Verify headers include `ngrok-skip-browser-warning`**

### Issue: "Better Auth sign-in fails"

**Symptoms:**
- Login button doesn't work
- "Sign up failed" error
- Session not created

**Solutions:**
1. **Check `BETTER_AUTH_URL` matches ngrok URL:**
   ```env
   BETTER_AUTH_URL=https://carylon-coconscious-fatally.ngrok-free.dev
   ```

2. **Verify Better Auth handler is mounted:**
   ```typescript
   // In server/src/index.ts
   app.all('/api/auth/*', toNodeHandler(auth))
   ```

3. **Check trusted origins** include your app's origin

4. **Verify database connection:**
   ```bash
   # Check DATABASE_URL in server/.env
   ```

### Issue: "Ngrok URL changes every time"

**Problem:** Free ngrok URLs are random and change on restart.

**Solutions:**
1. **Use ngrok fixed domain (paid):**
   ```bash
   # In server/package.json
   "ngrokfixed": "ngrok http --domain=your-fixed-domain.ngrok-free.app 3050"
   ```

2. **Use LocalTunnel with subdomain:**
   ```bash
   lt --port 3050 --subdomain yourname
   ```

3. **Update environment variables** each time URL changes (manual)

### Issue: "PayFast payment fails"

**Symptoms:**
- Payment modal opens but payment fails
- "No listing found in payment data"

**Solutions:**
1. **Check PayFast return URLs use ngrok:**
   ```typescript
   // In server/src/payment/payfastRouter.ts
   returnUrl: `${backendUrl}/payment/return?status=success&m_payment_id=${paymentId}`
   // backendUrl should be ngrok URL
   ```

2. **Verify ITN (notify) URL uses ngrok:**
   ```typescript
   notifyUrl: `${backendUrl}/payment/itn`
   ```

3. **Check payment metadata is stored** correctly

---

## Production Deployment

### When Deploying to Production

**Don't use ngrok in production!** Use a real domain and hosting service.

### Environment Variables for Production

**Server (Production):**
```env
BETTER_AUTH_URL=https://api.yourdomain.com
NODE_ENV=production
```

**App (Production):**
```env
EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com
EXPO_PUBLIC_ENV="PRODUCTION"
```

### Hosting Options

1. **Railway** - Easy deployment, see `RAILWAY_SETUP.md`
2. **Heroku** - Traditional PaaS
3. **Vercel** - Good for serverless
4. **AWS/GCP/Azure** - Full control

### CORS for Production

Update CORS to only allow your production domain:

```typescript
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'saplayer://', // Your app scheme
]
```

---

## Summary

### Quick Reference

**Start Development:**
1. `cd server && npm run dev`
2. `cd server && npm run ngrok` (copy URL)
3. Update `server/.env` and `app/.env` with ngrok URL
4. Restart server
5. `cd app && npm run start`

**Key Files:**
- `server/.env` - `BETTER_AUTH_URL`
- `app/.env` - `EXPO_PUBLIC_BACKEND_URL`
- `server/src/index.ts` - CORS configuration
- `server/src/auth/auth.ts` - Better Auth trusted origins

**Key Concepts:**
- Ngrok creates public HTTPS URL → localhost tunnel
- Both frontend and backend need ngrok URL in env vars
- CORS must allow ngrok origins
- Better Auth needs ngrok URL for callbacks
- PayFast needs ngrok URL for return/ITN URLs

---

## Additional Resources

- **Ngrok Dashboard:** https://dashboard.ngrok.com
- **Ngrok Docs:** https://ngrok.com/docs
- **Better Auth Expo Docs:** https://www.better-auth.com/docs/integrations/expo
- **Expo Deep Linking:** https://docs.expo.dev/guides/linking/

---

**Remember:** Ngrok is for **development only**. Use a real domain and hosting service for production!
