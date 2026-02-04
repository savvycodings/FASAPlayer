# Ngrok Setup for Mac and Windows

## Quick Answer

**The `ngrok config add-authtoken` command can be run from ANY directory** - it's a global command that configures ngrok on your machine. However, you need to run it **separately on each machine** (Windows and Mac).

---

## Setup on Each Machine

### On Windows (Your Current Machine)

You've already done this, but here's the reference:

```bash
# Option 1: Using npx (no installation needed - recommended)
cd server
npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd

# Option 2: If you installed ngrok globally
ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

**Note:** The directory doesn't matter - you can run it from `server/`, `app/`, or anywhere. It stores the config in your user directory.

### On Mac (When You Switch)

**Option 1: Using npx (Recommended - No Installation)**

```bash
# Navigate to your project
cd /path/to/gradeit/server

# Configure authtoken (same token, different machine)
npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

**Option 2: Install ngrok with Homebrew (Optional)**

If you prefer to have ngrok installed globally:

```bash
# Install ngrok
brew install ngrok

# Configure authtoken
ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

**Option 3: Install ngrok Manually**

1. Download from: https://ngrok.com/download
2. Extract and add to PATH
3. Run: `ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd`

---

## Important Notes

### 1. Authtoken is Account-Wide

- ✅ **Same authtoken** works on both Windows and Mac
- ✅ **One ngrok account** = same authtoken everywhere
- ⚠️ **Must configure on each machine** separately

### 2. Where to Run the Command

**It doesn't matter which directory you're in!** The command:
- Stores config in: `~/.ngrok2/ngrok.yml` (Mac) or `C:\Users\YourName\.ngrok2\ngrok.yml` (Windows)
- Is machine-specific (not project-specific)
- Only needs to be run once per machine

**Common locations people run it:**
- ✅ `cd server && npx ngrok config add-authtoken ...` (works)
- ✅ `cd app && npx ngrok config add-authtoken ...` (works)
- ✅ `cd ~ && npx ngrok config add-authtoken ...` (works)
- ✅ Any directory (all work the same)

### 3. Running Ngrok

**After configuring authtoken, run ngrok from the `server/` directory:**

```bash
# On Windows
cd server
npm run ngrok

# On Mac
cd server
npm run ngrok
```

This uses the script in `server/package.json`:
```json
"ngrok": "npx ngrok http 3050 --request-header-add 'ngrok-skip-browser-warning: true'"
```

---

## Complete Mac Setup Steps

### Step 1: Clone/Open Project on Mac

```bash
cd /path/to/gradeit
```

### Step 2: Configure Ngrok (One Time)

```bash
cd server
npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

**Output:** `Authtoken saved to configuration file: /Users/yourname/.ngrok2/ngrok.yml`

### Step 3: Install Dependencies (If Not Done)

```bash
# Install server dependencies
cd server
npm install

# Install app dependencies
cd ../app
npm install
```

### Step 4: Set Up Environment Variables

**`server/.env`:**
```env
BETTER_AUTH_URL=https://your-ngrok-url.ngrok-free.dev
# (Update this after starting ngrok)
```

**`app/.env`:**
```env
EXPO_PUBLIC_BACKEND_URL=https://your-ngrok-url.ngrok-free.dev
# (Update this after starting ngrok)
```

### Step 5: Start Development

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start ngrok
cd server
npm run ngrok
# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.dev)

# Terminal 3: Update .env files with ngrok URL, then restart server

# Terminal 4: Start Expo
cd app
npm run start
```

---

## Differences Between Windows and Mac

### Path Separators
- **Windows:** `C:\Users\YourName\.ngrok2\ngrok.yml`
- **Mac:** `~/.ngrok2/ngrok.yml` or `/Users/YourName/.ngrok2/ngrok.yml`

### Command Line
- **Windows:** Uses PowerShell or CMD
- **Mac:** Uses Terminal (bash/zsh)

### Package Managers
- **Windows:** Can use `npx` (same as Mac) or install globally
- **Mac:** Can use `npx`, `brew install ngrok`, or manual install

### Everything Else is the Same!

- ✅ Same authtoken
- ✅ Same `npm run ngrok` command
- ✅ Same environment variables
- ✅ Same workflow

---

## Troubleshooting

### "ngrok: command not found" on Mac

**Solution:** Use `npx ngrok` instead:
```bash
npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

Or install with Homebrew:
```bash
brew install ngrok
```

### "authentication failed" on Mac

**Solution:** Make sure you ran the authtoken command:
```bash
npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

Check if config file exists:
```bash
cat ~/.ngrok2/ngrok.yml
```

### Different ngrok URLs on Each Machine

**This is normal!** Each machine gets its own ngrok URL when you start ngrok. You need to:
1. Update `server/.env` with the Mac's ngrok URL
2. Update `app/.env` with the Mac's ngrok URL
3. Restart server and Expo

**Tip:** Use a paid ngrok account for a fixed domain that works on both machines.

---

## Summary

### Quick Reference

**Configure ngrok (one time per machine):**
```bash
# From any directory
npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd
```

**Run ngrok (daily):**
```bash
cd server
npm run ngrok
```

**Key Points:**
- ✅ Authtoken command can be run from any directory
- ✅ Same authtoken works on Windows and Mac
- ✅ Must configure on each machine separately
- ✅ Use `npx ngrok` (no installation needed)
- ✅ Or install with `brew install ngrok` on Mac

---

## Next Steps

1. **On Mac:** Run `npx ngrok config add-authtoken 38fXEoEeD99iR2wCcHTxwLvZo5P_8ovUhEdHQf81DnmnHBpd`
2. **On Mac:** Start ngrok with `cd server && npm run ngrok`
3. **On Mac:** Update environment variables with new ngrok URL
4. **On Mac:** Start server and Expo

That's it! The setup is identical on both machines.
