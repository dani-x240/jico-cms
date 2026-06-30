# Terminal Commands for GitHub Codespaces

Copy and paste these commands ONE at a time into your Codespaces terminal.

## Phase 1: Initial Setup (Do Once)

Run these commands when you first open Codespaces:

### 1. Install All npm Dependencies
```bash
npm install
```
**Wait for this to complete (takes 1-3 minutes)**

### 2. Install Capacitor CLI Globally
```bash
npm install -g @capacitor/cli
```

---

## Phase 2: Build Android APK

After Phase 1 is done, run these:

### 3. Prepare Android Project
```bash
npm run prepare:android
```
**This creates the Android folder structure**

### 4. Build the APK
```bash
npm run build:mobile
```
**This compiles your React app and creates the APK file**

---

## Phase 3: Get Your APK

After Phase 2 completes successfully:

### 5. List the APK File Location
```bash
ls -la android/app/build/outputs/apk/debug/
```

You should see: `app-debug.apk`

### 6. Download the APK
In Codespaces, left panel → navigate to `android/app/build/outputs/apk/debug/app-debug.apk` → Right-click → Download

---

## All Commands in One Block (Copy One By One)

```
npm install
npm install -g @capacitor/cli
npm run prepare:android
npm run build:mobile
ls -la android/app/build/outputs/apk/debug/
```

---

## If Something Goes Wrong

### Clean Everything and Start Over
```bash
npm run clean
rm -rf android
npm install
npm run prepare:android
npm run build:mobile
```

### Check Current Folder
```bash
pwd
```
Should show: `/workspace` or `/workspaces/jico-cms`

### List All Available NPM Scripts
```bash
npm run
```

### Check Node Version
```bash
node --version
npm --version
```

Should be Node 16+ and npm 7+

---

## Typical Time Breakdown

| Step | Time | What It Does |
|------|------|-------------|
| `npm install` | 1-3 min | Downloads all packages |
| `npm install -g @capacitor/cli` | 30 sec | Installs build tool |
| `npm run prepare:android` | 1-2 min | Sets up Android project |
| `npm run build:mobile` | 2-5 min | Builds the APK |

**Total: 5-12 minutes**

---

## After You Have the APK

### Install on Your Phone (Windows/Mac/Linux)

**Option 1: Drag & Drop (Easiest)**
1. Connect Android phone via USB
2. Enable USB Debugging (Settings → Developer Options)
3. Drag `app-debug.apk` to phone
4. Open file on phone → Tap Install

**Option 2: Command Line (ADB)**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Pro Tips

- **Keep Codespaces open** - You can rebuild APK without reopening
- **Use VS Code terminal** - Easier than web terminal
- **Don't close during build** - Let builds complete
- **Check internet** - Codespaces needs good connection for npm install

---

**Once APK is installed on your phone, test:**
1. Sign up a new school
2. Login with email
3. Upload a logo
4. See your school dashboard
5. Test forgot password
