# GitHub Codespaces - APK Build Guide

This guide shows you exactly what to do in GitHub Codespaces terminal to build your Capacitor Android APK.

## Step 1: Clone and Open in Codespaces

1. Go to your GitHub repo: https://github.com/dani-x240/jico-cms
2. Click the **Code** button (green button)
3. Click **Codespaces** tab
4. Click **Create codespace on school-cms-app**
5. Wait for the environment to load (takes ~2 minutes)

---

## Step 2: Terminal Commands - Copy & Paste Each Line

Once Codespaces opens, you'll see a terminal. **Copy and paste each command below one at a time:**

### Command 1: Install Dependencies
```bash
npm install
```
**Wait until this finishes completely (you'll see "added X packages")**

### Command 2: Install Capacitor CLI Globally
```bash
npm install -g @capacitor/cli
```

### Command 3: Prepare Android Project
```bash
npm run prepare:android
```

### Command 4: Build APK
```bash
npm run build:mobile
```

---

## Step 3: Locate Your APK File

After the build completes successfully, your APK will be in:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### To Download the APK:

1. In the Codespaces file explorer on the left, navigate to: `android → app → build → outputs → apk → debug`
2. Right-click on `app-debug.apk`
3. Click **Download**
4. The file will download to your computer

---

## Step 4: Install APK on Android Device

**Transfer to your phone and install:**

1. Connect your Android phone to your computer
2. Enable "USB Debugging" on your phone (Settings → Developer Options)
3. Use Android File Transfer or drag the APK to your phone
4. Open the APK file on your phone and tap **Install**

---

## Troubleshooting

### If you get "command not found" errors:
- Make sure each command completed successfully before running the next one
- Check that you're in the correct folder: `/workspace`

### If npm install fails:
```bash
npm cache clean --force
npm install
```

### If build fails:
```bash
npm run clean
npm run prepare:android
npm run build:mobile
```

### To check your project structure:
```bash
ls -la
```

---

## Important: Database Setup (Do This First!)

**Before installing the app, you MUST set up the database:**

1. Go to your Supabase dashboard: https://app.supabase.com
2. Go to SQL Editor
3. Open a new query
4. Copy all contents from your project file: `database_schema_multitenant.sql`
5. Paste it into Supabase SQL Editor
6. Click **Run**
7. Wait for it to complete

Only after the database is set up should you generate the APK.

---

## Summary of All Commands (Quick Reference)

```bash
# Step 1: Install all packages
npm install

# Step 2: Install Capacitor globally
npm install -g @capacitor/cli

# Step 3: Prepare Android
npm run prepare:android

# Step 4: Build the APK
npm run build:mobile
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Need More Help?

Check package.json for available scripts:
```bash
npm run
```

This shows all available commands you can run.
