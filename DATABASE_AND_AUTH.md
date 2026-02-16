# Database & Auth Overview

## Database

**Stack:** PostgreSQL (Neon), Drizzle ORM. Schema lives in `server/src/db/schema.ts`.

**Push (write schema to DB):** From `server/` run `pnpm run db:push`. Drizzle compares `schema.ts` to the DB and applies changes (creates/alters tables). No migration files; direct sync.

**Receive (read/write data):** Server uses `db` from `server/src/db/drizzle.ts` and table imports from `server/src/db`. Example: `db.select().from(users).where(eq(users.id, id))` or `db.insert(storeListings).values({...}).returning()`. App calls REST endpoints (e.g. `GET/POST /api/store/listings`); server runs these Drizzle queries and returns JSON.

**Main tables:** `users`, `sessions`, `accounts`, `verification_tokens` (auth); `stores`, `store_listings`, `orders`, `collections`, `followers`, etc. (app data). Auth tables are used by Better Auth; app routes use the rest.

---

## Auth System

**Provider:** Better Auth with Drizzle adapter and Expo plugin. Server: `server/src/auth/auth.ts`. App client: `app/src/lib/auth-client.ts` (baseURL from env).

**Creating accounts:** User fills email, password, (name on sign-up) on `app/src/screens/auth/Login.tsx`. App calls `authClient.signUp.email({ email, password, name })` or `authClient.signIn.email({ email, password })`. Those hit `POST /api/auth/sign-up/email` and `POST /api/auth/sign-in/email` (Better Auth routes mounted at `/api/auth/*` in `server/src/index.ts`). Better Auth hashes the password, creates a row in `users` (and `accounts` for email provider), creates a session in `sessions`, and sets a cookie (web) or returns session data (Expo). No custom sign-up/sign-in logic in `authRouter` for this flow; Better Auth owns it.

**After sign-in:** Login screen writes `authToken` and `hasSeenOnboarding` to AsyncStorage so `RootNavigator` treats the user as logged in and sends them to Main. Session is validated on later API calls via Better Auth cookies or Bearer token (store router uses `auth.api.getSession` / session token lookup).

---

## Onboarding & App Entry

**Flow:** `app/src/navigation/RootNavigator.tsx` reads AsyncStorage for `hasSeenOnboarding` and `authToken`. If no onboarding → show **Onboarding** (`app/src/screens/onboarding/Onboarding.tsx`, 5 screens). On “Get Started” or skip, it sets `hasSeenOnboarding` to `'true'` and navigates to **Auth** (Login). If not authenticated → **Auth**. If authenticated → **Main**.

**Onboarding:** Five screens (OnboardingScreen1–5); no API calls. Finishes by calling `AsyncStorage.setItem('hasSeenOnboarding', 'true')` and navigating to Auth. No DB involvement.
