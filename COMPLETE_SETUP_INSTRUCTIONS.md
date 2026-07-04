# Complete Setup Instructions - From Database to Production

## Overview
This guide will take you through every step to:
1. Set up the Supabase database
2. Get your database connection credentials
3. Clone the project to your computer
4. Set up the project in VSCode
5. Install all dependencies
6. Configure the environment variables
7. Test the complete app
8. Push to GitHub

---

## PART 1: DATABASE SETUP (Supabase)

### Step 1.1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Log in with your account
3. Find your project: **jico-cms** (or create one)
4. Click on your project to open it

### Step 1.2: Run the Database Schema

**IMPORTANT:** Do this FIRST before anything else!

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open this file in a text editor:
   - Location: Your project folder → `database_schema_multitenant.sql`
4. Copy ALL the contents of that file
5. Paste everything into the Supabase SQL Editor
6. Click the **Run** button (or press Ctrl+Enter)
7. Wait for it to complete (should take 5-10 seconds)
8. You should see messages like "created table" - this is good!

**What was created:**
- `schools` table (for multi-tenant support)
- `password_resets` table (for forgot password feature)
- `school_id` column added to all existing tables
- Automatic cleanup functions

### Step 1.3: Get Your Database Credentials

You'll need these for configuration:

1. In Supabase dashboard, click **Settings** (bottom left)
2. Click **Database** in the left menu
3. Find these credentials:
   - **Connection String:** Look for "Connection pooling" section
   - Copy the entire connection string
   - It looks like: `postgresql://postgres:password@...`

4. Also get your **API Keys:**
   - In Supabase, go to **Settings** → **API**
   - Find these keys:
     - `SUPABASE_URL` (Project URL)
     - `SUPABASE_ANON_KEY` (Anon Public Key)
     - `SUPABASE_SERVICE_ROLE_KEY` (Service Role Key)

**Save these in a text file** - you'll need them in 15 minutes!

---

## PART 2: CLONE PROJECT TO YOUR COMPUTER

### Step 2.1: Open Terminal/Command Prompt

**On Windows:**
- Press `Win + R`
- Type `cmd`
- Press Enter

**On Mac:**
- Press `Cmd + Space`
- Type `terminal`
- Press Enter

### Step 2.2: Navigate to Where You Want the Project

```bash
cd Desktop
```

Or wherever you want to save the project.

### Step 2.3: Clone the Repository

```bash
git clone https://github.com/dani-x240/jico-cms.git
```

Wait for it to complete (might take 1-2 minutes).

### Step 2.4: Navigate into the Project

```bash
cd jico-cms
```

### Step 2.5: Switch to the Correct Branch

```bash
git checkout school-cms-app
```

Confirm you're on the right branch:
```bash
git branch
```

You should see `* school-cms-app` highlighted.

---

## PART 3: OPEN PROJECT IN VSCODE

### Step 3.1: Open VSCode
- Open Visual Studio Code
- Click **File** → **Open Folder**
- Navigate to your `jico-cms` folder
- Click **Select Folder**

### Step 3.2: Wait for VSCode to Load
- You'll see files and folders appear on the left
- It might show a popup about installing recommended extensions - click **Install**

### Step 3.3: Open Terminal in VSCode
- Click **Terminal** (top menu) → **New Terminal**
- Or press `Ctrl + `` (backtick)
- A terminal should appear at the bottom

---

## PART 4: INSTALL DEPENDENCIES

### Step 4.1: Install Node Modules

In the VSCode terminal, type:

```bash
npm install
```

**What to expect:**
- You'll see lots of text scrolling
- It says "added X packages" at the end
- This takes 3-5 minutes
- You might see some yellow warnings - that's okay

### Step 4.2: Install Capacitor (for Android APK)

```bash
npm install -g @capacitor/cli
```

---

## PART 5: CONFIGURE ENVIRONMENT VARIABLES

### Step 5.1: Check if `.env.local` Exists

In VSCode, look at the file explorer on the left.

Do you see a file called `.env.local`? 

- **If YES:** Go to Step 5.2
- **If NO:** Create it (see Step 5.2)

### Step 5.2: Create/Edit `.env.local`

1. Right-click in the file explorer (left side)
2. Click **New File**
3. Name it exactly: `.env.local`
4. Open it
5. Copy and paste this (replace with YOUR actual keys from Step 1.3):

```
REACT_APP_SUPABASE_URL=https://cwmbskmdqgsqbrfwfuen.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace:
- `your_anon_key_here` with your SUPABASE_ANON_KEY
- `your_service_role_key_here` with your SUPABASE_SERVICE_ROLE_KEY

### Step 5.3: Save the File

Press `Ctrl + S` to save.

---

## PART 6: VERIFY SUPABASE CONNECTION

### Step 6.1: Check src/utils/supabase.js

1. In VSCode, open this file:
   - Click on `src` folder
   - Open `utils` folder
   - Click `supabase.js`

2. You should see something like:
```javascript
const SUPABASE_URL = 'https://cwmbskmdqgsqbrfwfuen.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
```

This is correct! The URL is hardcoded (this is the public URL), and the key comes from environment variables.

---

## PART 7: START THE DEVELOPMENT SERVER

### Step 7.1: Run the App

In the VSCode terminal, type:

```bash
npm start
```

**What to expect:**
- You'll see lots of compilation text
- It says "Compiled successfully" (might take 1-2 minutes)
- A browser window opens automatically at `http://localhost:3000`

### Step 7.2: Test the App

You should see the **Login page** with:
- Email field (not Staff ID)
- Password field
- "Forgot password?" link
- "Register your school" option

**If you see this:** Your app is working! ✓

---

## PART 8: TEST THE COMPLETE FLOW

### Step 8.1: Sign Up a New School

1. Click **"Register your school"** link
2. Fill in all fields:
   - **School Name:** Test School
   - **EMIS Number:** 12345
   - **Location:** Your City
   - **Phone:** 1234567890
   - **Address:** Test Address
   - **Logo (Optional):** Upload a school logo or skip
   - **Email:** admin@testschool.com
   - **Password:** Test@123
3. Click **Create School**
4. You should see: "School registered successfully"

### Step 8.2: Login as School Admin

1. Go back to login
2. Enter:
   - Email: `admin@testschool.com`
   - Password: `Test@123`
3. Click **Login**
4. You should see the **Dashboard** with your school name/logo

### Step 8.3: Test Forgot Password

1. Click **Logout**
2. Click **Forgot password?**
3. Enter your school admin email
4. You should see: "Check your email for reset link"

(Note: Emails won't actually send in development - this is expected)

### Step 8.4: Add a Teacher

1. Login again as admin
2. Go to **Teachers** (sidebar menu)
3. Click **Add Teacher**
4. Fill in:
   - Name: Test Teacher
   - Email: teacher@testschool.com
   - Password: Test@123
   - Role: Teacher
5. Click **Save**
6. You should see the teacher in the list

### Step 8.5: Logout and Login as Teacher

1. Logout
2. Login with teacher email: `teacher@testschool.com`
3. You should see teacher dashboard
4. Verify the school logo shows in the sidebar

---

## PART 9: UPDATE DATA ISOLATION (Critical!)

**You still need to add school_id filtering to these pages:**

1. `Teachers.js`
2. `Classes.js`
3. `Attendance.js`
4. `Dashboard.js`
5. `Students.js` (already done)
6. `MyReports.js`, `SubmitReport.js`, `ClassReports.js`
7. All other pages that query Supabase

### The Pattern (Copy This)

In each file's main query function, add:

**OLD:**
```javascript
const { data, error } = await supabase
  .from('teachers')
  .select('*');
```

**NEW:**
```javascript
const schoolId = user.school_id || user.id;
const { data, error } = await supabase
  .from('teachers')
  .select('*')
  .eq('school_id', schoolId);
```

**Key changes:**
1. Add: `const schoolId = user.school_id || user.id;`
2. Add: `.eq('school_id', schoolId)` after `.select('*')`

Do this for every page that has database queries.

---

## PART 10: COMMIT AND PUSH TO GITHUB

### Step 10.1: Check What Changed

In VSCode terminal:

```bash
git status
```

You should see files listed like:
- `Teachers.js` (modified)
- `Classes.js` (modified)
- etc.

### Step 10.2: Stage All Changes

```bash
git add .
```

### Step 10.3: Create a Commit

```bash
git commit -m "feat: add school_id filtering to all data pages for multi-tenant isolation"
```

### Step 10.4: Push to GitHub

```bash
git push origin school-cms-app
```

**What to expect:**
- You might be asked for GitHub credentials
- It takes a few seconds
- You should see: "To https://github.com/dani-x240/jico-cms.git"

### Step 10.5: Verify on GitHub

1. Go to https://github.com/dani-x240/jico-cms
2. Click the **school-cms-app** branch dropdown
3. You should see your latest commit message

---

## PART 11: BUILD ANDROID APK

### Step 11.1: Prepare Android Build

In VSCode terminal:

```bash
npm run prepare:android
```

Wait for it to complete (takes 2-3 minutes).

### Step 11.2: Build the APK

```bash
npm run build:mobile
```

Wait for completion (takes 3-5 minutes).

### Step 11.3: Find Your APK

In VSCode file explorer:
1. Navigate to: `android` → `app` → `build` → `outputs` → `apk` → `debug`
2. You should see `app-debug.apk`
3. Right-click it → **Reveal in Explorer/Finder**
4. You can now transfer it to your phone or share it

---

## PART 12: TROUBLESHOOTING

### Problem: "Cannot find module 'supabase'"

**Solution:**
```bash
npm install @supabase/supabase-js
```

### Problem: "REACT_APP_SUPABASE_URL is undefined"

**Solution:**
1. Make sure `.env.local` exists (not `.env`)
2. Make sure you saved it (Ctrl + S)
3. Restart: Press Ctrl + C in terminal, then `npm start` again

### Problem: "Compiled with errors"

**Solution:**
1. Check VSCode terminal for the error message
2. Look for file name and line number
3. Open that file and fix the error
4. The app will automatically refresh

### Problem: Database queries return empty

**Solution:**
1. Make sure you ran `database_schema_multitenant.sql` in Supabase
2. Make sure you added `school_id` filtering to the page's query
3. Make sure you're logged in as a user with a `school_id`

### Problem: Can't push to GitHub

**Solution:**
```bash
git config user.email "your@email.com"
git config user.name "Your Name"
git push origin school-cms-app
```

---

## SUMMARY CHECKLIST

Complete these in order:

- [ ] 1. Run `database_schema_multitenant.sql` in Supabase
- [ ] 2. Get database credentials from Supabase
- [ ] 3. Clone project: `git clone https://github.com/dani-x240/jico-cms.git`
- [ ] 4. Switch branch: `git checkout school-cms-app`
- [ ] 5. Open in VSCode
- [ ] 6. Install dependencies: `npm install`
- [ ] 7. Create `.env.local` with Supabase credentials
- [ ] 8. Start app: `npm start`
- [ ] 9. Test signup, login, forgot password
- [ ] 10. Add school_id filtering to all data pages
- [ ] 11. Commit: `git commit -m "..."`
- [ ] 12. Push: `git push origin school-cms-app`
- [ ] 13. Build APK: `npm run prepare:android && npm run build:mobile`

---

## QUICK COMMAND REFERENCE

**Setup:**
```bash
git clone https://github.com/dani-x240/jico-cms.git
cd jico-cms
git checkout school-cms-app
npm install
npm install -g @capacitor/cli
```

**Development:**
```bash
npm start
```

**Testing:**
```bash
npm test
```

**Build APK:**
```bash
npm run prepare:android
npm run build:mobile
```

**Git Push:**
```bash
git add .
git commit -m "Your message"
git push origin school-cms-app
```

---

## WHAT YOU HAVE AFTER FOLLOWING THIS GUIDE

✓ Multi-tenant CMS (unlimited schools)
✓ Each school has isolated data
✓ Custom logos per school
✓ Email-based login
✓ Forgot password feature
✓ School admin settings
✓ All existing features working
✓ Android APK ready to distribute
✓ Code in GitHub

---

## NEED HELP?

If you get stuck:
1. Read the error message carefully
2. Check the Troubleshooting section
3. Make sure all previous steps were completed
4. Don't skip the database setup - that's critical!

Good luck! 🚀
