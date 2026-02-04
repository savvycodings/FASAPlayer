# Better Auth with Expo - Complete Setup

## ✅ What's Been Set Up

### Server Side (`server/`)
1. ✅ **Better Auth installed** with `@better-auth/expo` plugin
2. ✅ **`server/src/auth/auth.ts`** - Better Auth configuration with:
   - Drizzle adapter for PostgreSQL
   - Expo plugin enabled
   - Trusted origins for development (`exp://` scheme)
   - Dynamic baseURL (supports ngrok)
3. ✅ **Mounted in `server/src/index.ts`** - Better Auth handler at `/api/auth/*`

### App Side (`app/`)
1. ✅ **Better Auth packages installed**:
   - `better-auth`
   - `@better-auth/expo`
   - `expo-secure-store`
   - `expo-network`
   - `expo-linking`, `expo-web-browser`, `expo-constants`
2. ✅ **`app/src/lib/auth-client.ts`** - Better Auth client with:
   - Dynamic baseURL (same pattern as PayFastPayment)
   - Expo client plugin
   - SecureStore for session storage
3. ✅ **`app/metro.config.js`** - Enabled `unstable_enablePackageExports`
4. ✅ **`app/src/screens/auth/Login.tsx`** - Updated to use Better Auth
5. ✅ **`app/constants.ts`** - Updated with dynamic URL detection

---

## 🔧 Configuration

### Server `.env` (`server/.env`)

```env
BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
BETTER_AUTH_URL=http://localhost:3050

# For mobile development with ngrok:
# BETTER_AUTH_URL=https://your-ngrok-url.ngrok-free.app
```

### App `.env` (`app/.env`)

```env
EXPO_PUBLIC_ENV="DEVELOPMENT"
EXPO_PUBLIC_DEV_API_URL="http://localhost:3050"

# For mobile development with ngrok (recommended):
# EXPO_PUBLIC_BACKEND_URL="https://your-ngrok-url.ngrok-free.app"
# This will be used by both Better Auth and other API calls
```

---

## 🚀 Using Ngrok (Recommended for Mobile)

### Step 1: Start Server
```bash
cd server
npm run dev
```

### Step 2: Start Ngrok
```bash
cd server
npm run ngrok
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### Step 3: Update Environment Variables

**`server/.env`:**
```env
BETTER_AUTH_URL=https://abc123.ngrok-free.app
```

**`app/.env`:**
```env
EXPO_PUBLIC_BACKEND_URL=https://abc123.ngrok-free.app
```

### Step 4: Restart Everything
```bash
# Restart server
cd server
npm run dev

# Restart Expo (in new terminal)
cd app
npm run start --clear
```

---

## 📱 How It Works

### URL Resolution Priority

1. **`EXPO_PUBLIC_BACKEND_URL`** (if set) - Used for all API calls
2. **Web**: `localhost:3050`
3. **Mobile**: IP from `app.json` → `extra.backendIp` → `192.168.1.9:3050`

### Better Auth Endpoints

Better Auth creates these endpoints automatically:
- `POST /api/auth/sign-up` - Sign up
- `POST /api/auth/sign-in` - Sign in
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Sign out
- And more...

### Trusted Origins (Development)

The server is configured to trust:
- `saplayer://` - Your app scheme
- `exp://` - Expo Go development URLs
- `exp://192.168.*.*:*/**` - Local IP ranges

This allows OAuth redirects to work in development.

---

## 🔄 Migration from Custom Auth

Your custom `authRouter.ts` is still mounted, so you can:
1. **Test Better Auth** alongside custom auth
2. **Gradually migrate** users to Better Auth
3. **Remove custom auth** once everything works

---

## 🧪 Testing

### Test Sign Up
```typescript
import { authClient } from '@/lib/auth-client'

await authClient.signUp.email({
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
})
```

### Test Sign In
```typescript
await authClient.signIn.email({
  email: 'test@example.com',
  password: 'password123'
})
```

### Check Session
```typescript
const { data: session } = authClient.useSession()
console.log('Current user:', session?.user)
```

---

## 📝 Next Steps

1. **Run database migrations** - Better Auth needs its own tables
2. **Test on mobile** - Use ngrok URL
3. **Test on web** - Should work with localhost
4. **Remove custom auth** - Once Better Auth is fully tested

---

## ⚠️ Important Notes

- **Database**: Better Auth will create its own tables. Make sure your database is accessible.
- **Secrets**: Keep `BETTER_AUTH_SECRET` secure and use different values for dev/prod
- **Ngrok**: Free tier URLs change on restart. Consider paid tier for fixed domains.
- **Metro**: Clear cache after installing packages: `npm run start --clear`

---

## 🔗 Resources

- [Better Auth Expo Docs](https://www.better-auth.com/docs/integrations/expo)
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/guides/database#drizzle)
- [Ngrok Setup Guide](./MOBILE_DEVELOPMENT_SETUP.md)
