# Onboarding & Authentication Setup

## ✅ What's Been Created

### 1. **5 Onboarding Screens**
- **Screen 1**: Welcome screen with app overview
- **Screen 2**: Smart card recognition feature
- **Screen 3**: Portfolio value tracking
- **Screen 4**: Buy, sell & trade marketplace
- **Screen 5**: Final screen with "Get Started" button

### 2. **Login/Auth Screen**
- Beautiful login/signup page with:
  - Email and password authentication
  - Toggle between sign in and sign up
  - Password visibility toggle
  - Google sign-in button (placeholder)
  - Form validation

### 3. **Navigation Flow**
- **Onboarding** → **Login** → **Main App**
- Automatically checks if user has seen onboarding
- Checks authentication status
- Saves onboarding and auth state to AsyncStorage

## 🚀 Setup Instructions

### Step 1: Create Database Table

Run this SQL in your Neon database console:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

Or use the migration file:
```bash
# Connect to your Neon database and run:
psql $DATABASE_URL -f server/src/db/migrations/001_create_users_table.sql
```

### Step 2: Environment Variables

**Server (`server/.env`):**
```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
BETTER_AUTH_SECRET=c0AaF2eamheRYbcHJHr1i5dqYFNSt7u0
BETTER_AUTH_URL=http://localhost:3050
```

**App (`app/.env`):**
```env
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3050
EXPO_PUBLIC_ENV=DEVELOPMENT
EXPO_PUBLIC_DEV_API_URL=http://localhost:3050
```

### Step 3: Test the Flow

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the app:**
   ```bash
   cd app
   npm start
   ```

3. **Test flow:**
   - App should show onboarding screens first
   - After completing onboarding, shows login screen
   - After login, shows main app

## 📱 User Flow

```
App Launch
    ↓
Check AsyncStorage
    ↓
Has seen onboarding? ──No──→ Show Onboarding Screens
    │                              ↓
   Yes                          Complete → Save to AsyncStorage
    ↓                              ↓
Is authenticated? ──No──→ Show Login Screen
    │                          ↓
   Yes                    Sign In/Up → Save token
    ↓                          ↓
Show Main App ←────────────────┘
```

## 🔐 Authentication Endpoints

### Sign Up
```
POST /api/auth/sign-up
Body: {
  email: string
  password: string
  name?: string
}
```

### Sign In
```
POST /api/auth/sign-in
Body: {
  email: string
  password: string
}
```

## ⚠️ Security Notes

**Current Implementation:**
- Passwords are stored in plain text (NOT SECURE)
- Tokens are simple strings (NOT SECURE)

**For Production, you MUST:**
1. Hash passwords with `bcrypt` before storing
2. Use JWT tokens for authentication
3. Add password strength requirements
4. Add rate limiting
5. Add email verification
6. Use HTTPS in production

## 🎨 Customization

### Onboarding Screens
- Edit: `app/src/screens/onboarding/OnboardingScreen*.tsx`
- Change colors, text, icons in each screen

### Login Screen
- Edit: `app/src/screens/auth/Login.tsx`
- Customize form fields, styling, validation

### Navigation
- Edit: `app/src/navigation/RootNavigator.tsx`
- Modify flow logic, add screens

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Make sure server is running on port 3050
- Check `EXPO_PUBLIC_DEV_API_URL` in app `.env`
- For mobile: Update `backendIp` in `app/app.json`

### "Database connection failed"
- Check `DATABASE_URL` in server `.env`
- Verify Neon database is active
- Run the SQL migration to create users table

### "User already exists"
- The email is already registered
- Try signing in instead, or use a different email

### Onboarding keeps showing
- Clear app data or delete AsyncStorage key `hasSeenOnboarding`
- Or uninstall and reinstall the app

## 📝 Next Steps

1. ✅ Add password hashing (bcrypt)
2. ✅ Implement JWT tokens
3. ✅ Add email verification
4. ✅ Add password reset
5. ✅ Add social login (Google, etc.)
6. ✅ Add session management
7. ✅ Add logout functionality

---

**Files Created:**
- `app/src/screens/onboarding/OnboardingScreen1-5.tsx`
- `app/src/screens/onboarding/Onboarding.tsx`
- `app/src/screens/auth/Login.tsx`
- `app/src/navigation/RootNavigator.tsx`
- `server/src/auth/authRouter.ts`
- `server/src/db/migrations/001_create_users_table.sql`
