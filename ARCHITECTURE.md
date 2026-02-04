# GradeIt Architecture Explanation

## Overview

This is a **React Native Expo** application with an **Express.js backend server**. The app connects to the server via HTTP API calls, and the server will connect to a **Neon PostgreSQL** database for persistent data storage.

---

## 🏗️ Architecture Components

### 1. **React Native Expo App** (`/app` directory)

**Technology Stack:**
- React Native with Expo SDK 54
- TypeScript
- React Navigation for routing
- NativeWind (Tailwind CSS for React Native)

**How it connects to the server:**
- Uses environment variables to determine which API URL to use:
  - `EXPO_PUBLIC_ENV`: Either `"DEVELOPMENT"` or `"PRODUCTION"`
  - `EXPO_PUBLIC_DEV_API_URL`: Development server URL (e.g., `http://localhost:3050`)
  - `EXPO_PUBLIC_PROD_API_URL`: Production server URL (e.g., `https://staging.example.com`)

**API Connection Logic:**
- The app checks `EXPO_PUBLIC_ENV` in `app/constants.ts`
- If `DEVELOPMENT`: Uses `EXPO_PUBLIC_DEV_API_URL`
- If `PRODUCTION`: Uses `EXPO_PUBLIC_PROD_API_URL`

**Current Configuration:**
```env
EXPO_PUBLIC_ENV="DEVELOPMENT"
EXPO_PUBLIC_DEV_API_URL="http://localhost:3050"
EXPO_PUBLIC_PROD_API_URL="https://staging.example.com"
```

**Special Mobile Handling:**
- For mobile devices (Expo Go), the app uses the machine's IP address from `app.json` (`backendIp: "192.168.1.9"`)
- For web, it uses `localhost:3050`
- Components like `PayFastPayment.tsx` have custom backend URL detection logic

---

### 2. **Express.js Backend Server** (`/server` directory)

**Technology Stack:**
- Express.js
- TypeScript
- Node.js

**Current Setup:**
- Server runs on **port 3050**
- Uses `dotenv` to load environment variables from `.env` file
- CORS enabled for cross-origin requests
- Multiple routers:
  - `/chat` - AI chat endpoints
  - `/images` - Image generation endpoints
  - `/files` - File upload endpoints
  - `/pokedata` - Pokemon card data endpoints
  - `/payment` - PayFast payment integration

**Environment Variables (Server):**
```env
ENVIRONMENT="PRODUCTION"
BYTESCALE_API_KEY=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
POKEDATA_API_KEY="..."
COHERE_API_KEY=""
FAL_API_KEY=""
REPLICATE_KEY=""
GEMINI_API_KEY="..."
GOOGLE_VISION_API="..."
```

**Current Status:**
- ✅ Server is running
- ❌ **No database connection** (needs to be added)
- ❌ **No Better Auth setup** (needs to be added)

---

### 3. **Database: Neon PostgreSQL** (To be configured)

**What is Neon?**
- Neon is a serverless PostgreSQL database
- Provides a connection string that looks like:
  ```
  postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
  ```

**Why Neon?**
- Fully managed PostgreSQL
- Auto-scaling
- Free tier available
- Perfect for serverless/Node.js backends

---

## 🔄 Request Flow

### Example: User makes a payment

1. **User Action**: User taps "Buy Now" in the app
2. **App Request**: App calls `POST http://localhost:3050/payment/create-payment`
3. **Server Processing**: 
   - Server receives request
   - Creates payment in PayFast
   - **Should save to database** (not yet implemented)
   - Returns payment URL
4. **App Response**: App receives payment URL and opens PayFast checkout
5. **Payment Callback**: PayFast calls server `POST /payment/itn` with payment status
6. **Database Update**: Server should update payment status in database (not yet implemented)

---

## 🔐 Better Auth Configuration

**What is Better Auth?**
- Authentication library for React/React Native apps
- Supports multiple auth providers
- Works with various databases including PostgreSQL

**Configuration Needed:**

**Server-side (`server/.env`):**
```env
BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
BETTER_AUTH_URL=http://localhost:3050
```

**App-side (`app/.env`):**
```env
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3050
```

**Important Notes:**
- The app runs on `http://localhost:8081` (Expo default port)
- But Better Auth should point to the **server** URL (`http://localhost:3050`)
- Better Auth will handle auth endpoints at `/api/auth/*` on the server

---

## 🚀 Development Workflow

### Starting the Server:
```bash
cd server
npm install
npm run dev  # Runs on port 3050
```

### Starting the App:
```bash
cd app
npm install
npm start  # Starts Expo dev server on port 8081
```

### Environment Setup:
1. **Server** needs `.env` file with API keys and database connection
2. **App** needs `.env` file with environment variables (or use EAS env vars for production)

---

## 📝 Current Status

1. ✅ **Database Connection**: PostgreSQL client (`pg`) installed, connection module created
2. ⚠️ **Database Connection String**: Need to add `DATABASE_URL` to `server/.env`
3. ❌ **Better Auth Setup**: Need to install and configure Better Auth
4. ✅ **Better Auth URL Configuration**: Documented (should use server port 3050)

## 🔧 Quick Setup Checklist

### Database (Required First):
- [ ] Get Neon PostgreSQL connection string
- [ ] Add `DATABASE_URL` to `server/.env`
- [ ] Restart server to verify connection

### Better Auth (After Database):
- [ ] Install Better Auth packages (`npm install better-auth`)
- [ ] Add Better Auth configuration to server
- [ ] Create Better Auth database tables (migrations)
- [ ] Set up Better Auth client in app
- [ ] Test authentication flow

---

## 🔗 Connection Summary

```
┌─────────────────┐
│  Expo App       │
│  (port 8081)    │
└────────┬────────┘
         │ HTTP Requests
         │ (using DOMAIN from constants.ts)
         ▼
┌─────────────────┐
│  Express Server │
│  (port 3050)    │
└────────┬────────┘
         │ SQL Queries
         │ (Neon PostgreSQL)
         ▼
┌─────────────────┐
│  Neon Database  │
│  (cloud)        │
└─────────────────┘
```

---

## 📚 Key Files

**App:**
- `app/constants.ts` - API URL configuration
- `app/app.json` - Expo configuration
- `app/src/components/payment/PayFastPayment.tsx` - Example API usage

**Server:**
- `server/src/index.ts` - Server entry point
- `server/src/payment/payfastRouter.ts` - Payment endpoints
- `server/.env` - Server environment variables (needs DATABASE_URL)
