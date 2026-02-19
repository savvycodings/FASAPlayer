# User-specific settings flow (theme and preferences)

This document describes how **user-specific** preferences (e.g. theme) work in the app: changes are **local to the device/session** and do not affect other users or other devices. Use this pattern whenever you add a new preference that should be per-user (device-local) and not synced to the server.

---

## 1. Why it doesn’t affect other users

- Preferences are stored in **AsyncStorage** on the device.
- There is **no server call** to save or load theme (or chat model, image model, etc.).
- So:
  - User A’s theme change only updates **User A’s device**.
  - User B on another device never sees or receives that change.
  - Same user on another device has separate AsyncStorage, so they can have a different theme per device.

So “user” here means **this app instance on this device**; it’s device-local and session-persistent, not account-based or global.

---

## 2. Theme flow (step-by-step)

### 2.1 Where state lives

- **File:** `app/App.tsx`
- **State:** `const [theme, setTheme] = useState<string>('wizards')`
- Theme is a **string key** (e.g. `'wizards'`, `'dark'`, `'light'`) that identifies which theme object to use.

### 2.2 Persistence key

- **Storage key:** `'rnai-theme'`
- **Storage API:** `AsyncStorage` from `@react-native-async-storage/async-storage`
- Only this key is used for theme; no other keys and no server.

### 2.3 Load on app start (hydrate from device)

- **Where:** `App.tsx` → `configureStorage()` (called in `useEffect` on mount).
- **Logic:**
  1. `await AsyncStorage.getItem('rnai-theme')`
  2. If a value exists → `setTheme(_theme)` so the app uses that theme.
  3. If no value (first launch) → set default (e.g. `'wizards'`) and optionally `AsyncStorage.setItem('rnai-theme', 'wizards')` so next launch is consistent.

So the “user’s” choice is whatever was last saved on **this device**; no other user or device is involved.

### 2.4 Provide to the rest of the app (context)

- **Where:** `App.tsx` → `ThemeContext.Provider`
- **Value:**
  - `theme` – the **resolved theme object** (e.g. colors, fonts) from the current theme key. In this app it’s computed by `getTheme(theme)` from `* as themes from './src/theme'`.
  - `themeName` – the **string key** (e.g. `'wizards'`) so screens can compare or show the current selection.
  - `setTheme` – function to change the theme (see below).

Any screen or component under this provider can use `useContext(ThemeContext)` to read `theme` / `themeName` and call `setTheme` without touching AsyncStorage directly.

### 2.5 How the user “changes theme” (and why it stays user-specific)

- **Where:** `App.tsx` → `_setTheme(theme)`.
- **Logic:**
  1. `setTheme(theme)` – update React state so the UI re-renders with the new theme.
  2. `AsyncStorage.setItem('rnai-theme', theme)` – persist the **key** on the device.

Because:
- Only local state and AsyncStorage are updated,
- and no API call is made,

the change applies only to **this app on this device**. Other users and other devices are unaffected.

### 2.6 Where the user can change it (UI)

- Previously: Settings tab had a “Theme” section that called `setTheme(value.label)` (from ThemeContext). That `setTheme` is the same `_setTheme` from App that writes to AsyncStorage.
- Theme can be changed from any screen that has access to `ThemeContext` and calls `setTheme(newKey)`; the flow (state + AsyncStorage) remains the same.

---

## 3. Reusing this pattern elsewhere in the app

To add another **user-specific (device-local)** setting that doesn’t affect other users:

1. **Choose a unique AsyncStorage key**  
   Example: `'rnai-myFeature'`. Avoid reusing keys used for other settings.

2. **Hold state at the top level (e.g. App.tsx)**  
   - `const [mySetting, setMySetting] = useState<MyType>(defaultValue)`

3. **Load from AsyncStorage on mount**  
   In the same place you run `configureStorage()` (or a similar init effect):
   - `const stored = await AsyncStorage.getItem('rnai-myFeature')`
   - If `stored` is valid (e.g. parse JSON if needed) → `setMySetting(stored)`
   - Else → keep default and optionally `AsyncStorage.setItem('rnai-myFeature', defaultValue)` for next launch.

4. **Expose via context (optional but recommended)**  
   - If many screens need it: add to an existing context (e.g. AppContext) or create a small context.
   - Provide: `{ mySetting, setMySetting }` where `setMySetting` is a wrapper that:
     - updates state: `setMySetting(newValue)`
     - persists: `AsyncStorage.setItem('rnai-myFeature', newValue)` (or stringify if not string).

5. **Use in UI**  
   - In the screen where the user can change the setting (e.g. Settings or a dedicated “Preferences” screen), read from context and call `setMySetting(newValue)` on user action. No server call needed.

6. **Keep it user-specific**  
   - Do **not** send this preference to the backend (unless you later add an explicit “sync preferences to account” feature). As long as you only use AsyncStorage + local state, the setting stays device-local and does not change the app for others.

---

## 4. Summary table (theme example)

| Step              | Where          | What happens                                                                 |
|-------------------|----------------|-------------------------------------------------------------------------------|
| State             | App.tsx        | `useState<string>('wizards')`                                                |
| Storage key       | App.tsx        | `'rnai-theme'`                                                                |
| Load              | configureStorage | `AsyncStorage.getItem('rnai-theme')` → `setTheme(_theme)` or default        |
| Provide           | ThemeContext.Provider | `theme`, `themeName`, `setTheme` (wired to _setTheme)                 |
| Save on change    | _setTheme      | `setTheme(theme)` + `AsyncStorage.setItem('rnai-theme', theme)`              |
| Who is affected   | —              | Only this device; other users and devices are unaffected                      |

Using the same pattern (state + AsyncStorage key + load on init + setter that writes to both state and AsyncStorage) elsewhere will keep new settings user-specific in the same way.
