# Deploying GradeIt to Expo

Complete guide to build and deploy your app to Expo.

## Prerequisites

1. **Expo account** - Sign up at [expo.dev](https://expo.dev)
2. **Server deployed** - Your backend must be deployed to a public URL (Railway, Render, Heroku, etc.)
3. **EAS CLI** - We'll install this below

---

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

Or if you prefer using npx (no global install):
```bash
npx eas-cli@latest
```

---

## Step 2: Login to Expo

```bash
cd app
eas login
```

Enter your Expo account credentials.

---

## Step 3: Deploy Your Backend Server First! ⚠️

**IMPORTANT:** Your app won't work without the server running!

### Quick Server Deployment Options:

#### Option A: Railway (Easiest)
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your `server` folder
4. Add environment variables:
   - `GEMINI_API_KEY=your_key`
   - `POKEDATA_API_KEY=your_key`
5. Get your server URL (e.g., `https://gradeit-server.railway.app`)

#### Option B: Render
1. Go to [render.com](https://render.com)
2. New Web Service
3. Connect GitHub repo
4. Set root directory to `server`
5. Add environment variables
6. Deploy and get URL

#### Option C: Keep Using Localhost (Development Only)
If you just want to test locally, use ngrok:
```bash
cd server
yarn ngrok
```
This gives you a temporary public URL.

---

## Step 4: Set Environment Variables for Production

Set your production server URL in Expo:

```bash
cd app

# Set environment to production
eas env:create --scope project --name EXPO_PUBLIC_ENV --value PRODUCTION

# Set your production server URL (replace with your actual URL)
eas env:create --scope project --name EXPO_PUBLIC_PROD_API_URL --value https://your-server-url.com
```

**Example:**
```bash
eas env:create --scope project --name EXPO_PUBLIC_PROD_API_URL --value https://gradeit-server.railway.app
```

### Verify Environment Variables Are Set

```bash
eas env:list
```

You should see:
- `EXPO_PUBLIC_ENV` = `PRODUCTION`
- `EXPO_PUBLIC_PROD_API_URL` = `https://your-server-url.com`

---

## Step 5: Build Your App

### For Testing (Preview Build)

Build a preview version you can test on your device:

```bash
cd app

# iOS Preview Build
eas build --platform ios --profile preview

# Android Preview Build
eas build --platform android --profile preview
```

**What happens:**
- EAS builds your app in the cloud (takes 10-20 minutes)
- You'll get a download link when it's done
- Install the `.ipa` (iOS) or `.apk` (Android) on your device

### For Production (App Store/Play Store)

```bash
cd app

# iOS Production Build
eas build --platform ios --profile production

# Android Production Build
eas build --platform android --profile production
```

**Note:** Production builds require additional setup for App Store/Play Store submission.

---

## Step 6: Update Your App (After Code Changes)

When you make changes to your app code, you can update it without rebuilding:

### Over-The-Air (OTA) Updates

For JavaScript/TypeScript changes (no native changes):

```bash
cd app
eas update --branch production --message "Added AI grading feature"
```

**When to use OTA updates:**
- ✅ Changed React components
- ✅ Updated app logic
- ✅ Modified styles
- ✅ Changed API calls

**When you need a NEW BUILD:**
- ❌ Added new native dependencies
- ❌ Changed `app.json` settings
- ❌ Updated Expo SDK version
- ❌ Changed app icons/splash screens

---

## Step 7: Submit to App Stores (Optional)

### iOS (App Store)

**Prerequisites:**
- Apple Developer account ($99/year)
- App Store Connect app created

```bash
cd app
eas submit --platform ios --profile production
```

### Android (Play Store)

**Prerequisites:**
- Google Play Developer account ($25 one-time)
- Play Console app created

```bash
cd app
eas submit --platform android --profile production
```

---

## Quick Reference Commands

```bash
# Login
cd app
eas login

# Set environment variables
eas env:create --scope project --name EXPO_PUBLIC_ENV --value PRODUCTION
eas env:create --scope project --name EXPO_PUBLIC_PROD_API_URL --value https://your-server.com

# Build for testing
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Build for production
eas build --platform ios --profile production
eas build --platform android --profile production

# Update app (no rebuild needed)
eas update --branch production --message "Your update message"

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## Troubleshooting

### "Cannot connect to server" in production

1. **Check server is deployed**: Visit your server URL in a browser
2. **Verify environment variables**: Run `eas env:list`
3. **Check server logs**: Look for errors in Railway/Render dashboard
4. **Test server endpoint**: Try `https://your-server.com/pokedata/recognize` (should return an error about missing image, not 404)

### Build fails

1. **Check EAS environment variables**: `eas env:list`
2. **Verify app.json**: Make sure it's valid JSON
3. **Check build logs**: EAS dashboard shows detailed logs
4. **Try clearing cache**: `eas build --platform ios --profile preview --clear-cache`

### "Module not found" in build

- Make sure all dependencies are in `package.json`
- Run `yarn install` locally first to verify
- Check `node_modules` is in `.gitignore` (it should be)

### App works locally but not in production

- Server might not be deployed
- Environment variables not set correctly
- CORS issues (check server CORS settings)

---

## Current Configuration

- **Project ID**: `b1bc8dc6-318d-4665-a64d-ce6a46a5a2c0`
- **App Name**: GradeIt
- **Bundle ID (iOS)**: `com.gradeit.app`
- **Version**: 1.0.0

---

## Workflow Summary

1. ✅ **Deploy server** to Railway/Render/Heroku
2. ✅ **Set EAS environment variables** with production server URL
3. ✅ **Build app** with `eas build`
4. ✅ **Test preview build** on your device
5. ✅ **Update app** with `eas update` when you make changes
6. ✅ **Submit to stores** when ready

---

## Next Steps

1. Deploy your server (get a public URL)
2. Set EAS environment variables with that URL
3. Build your first preview build
4. Test it on your device
5. Make updates with `eas update` as needed!

Need help? Check [Expo docs](https://docs.expo.dev/) or [EAS docs](https://docs.expo.dev/build/introduction/).

