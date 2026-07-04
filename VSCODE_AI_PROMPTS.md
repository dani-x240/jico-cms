# VSCode AI Assistant Prompts - Complete Guide

## What to Tell the AI First

### PROMPT 1: Understanding the Project Structure
```
I have a React Ionic CMS app for schools. 
Before I do anything, analyze these files to understand the project:
1. package.json - shows all dependencies
2. src/App.js - main app file with routing
3. src/pages/Login.js - authentication
4. src/pages/Dashboard.js - main dashboard
5. database_schema_multitenant.sql - database structure

Tell me:
- What kind of app is this?
- What are the main features?
- What database does it use?
- Is it a web app, mobile app, or both?
- What's the technology stack?
```

**Wait for AI to respond and summarize the project**

---

### PROMPT 2: Check Environment Setup
```
Before I run the app, check if I have everything installed:

1. Do I need to create a .env.local file? If yes, what variables?
2. What version of Node.js do I need? (check package.json)
3. What does "npm install" do? (explain dependency installation)
4. What does "npm start" do? (explain dev server startup)
5. Is this app ready to run or do I need to set up the database first?

Show me a checklist of what I need before running npm start.
```

**AI will give you a checklist - follow it**

---

### PROMPT 3: Step-by-Step Setup
```
I want to set up this project step by step. Here's what I'll do:

STEP 1: Database Setup
- I have Supabase account at: https://cwmbskmdqgsqbrfwfuen.supabase.co
- What do I do with "database_schema_multitenant.sql" file?
- Where in Supabase do I run this SQL code?
- After running it, how do I verify it worked?

STEP 2: Environment Variables
- Create .env.local file with what variables?
- Where do I get these values from Supabase?
- Show me exactly what to put in .env.local

STEP 3: Install Dependencies
- I'll run: npm install
- This will take a few minutes
- What does it do exactly?

STEP 4: Start the App
- I'll run: npm start
- What should I see in the terminal?
- What URL will open in my browser?
- What should I see on the screen?

Give me the EXACT steps in order.
```

**AI will give you detailed steps - follow each one**

---

### PROMPT 4: Testing the App
```
After I run "npm start" and the app is running, how do I test it?

What should I try:
1. Creating a new school account (test signup)
2. Logging in with that school email
3. Uploading a logo and checking if it displays
4. Creating a teacher account
5. Logging in as a teacher
6. Checking if the dashboard shows school-specific data

For each test, tell me:
- What steps to do
- What I should see if it works
- What would be wrong if it doesn't work
```

**AI will give you testing steps**

---

### PROMPT 5: Building the APK
```
Now I want to build the Android APK to test on a real phone.

I need to:
1. First, what is an APK? (explain)
2. What requirements do I need? (Java, Android SDK, etc.)
3. The two commands I need to run are:
   - npm run prepare:android
   - npm run build:mobile
4. After running these, where will the APK file be?
5. How do I get it onto my phone?
6. What if it fails? What are common errors and how to fix them?

Give me the complete APK build process with all steps and what to expect.
```

**AI will explain APK building completely**

---

### PROMPT 6: Git Push
```
After everything works, I want to push my changes to GitHub.

I made some changes to:
- Added school_id filtering to some pages
- Tested the app
- Everything works locally

Now I need to:
1. Add all changes: git add .
2. Commit with message: git commit -m "feat: complete multi-tenant setup and testing"
3. Push to GitHub: git push origin school-cms-app

Tell me:
- What each command does
- What should I see in the terminal
- How to verify it pushed successfully
- Can I push without GitHub already configured?
```

**AI will explain git workflow**

---

## Files the AI MUST Read First

### MUST READ (Core Understanding)
1. **package.json** - Dependencies and scripts
2. **src/App.js** - Main routing and structure
3. **COMPLETE_SETUP_INSTRUCTIONS.md** - Detailed setup
4. **database_schema_multitenant.sql** - Database setup

### SHOULD READ (Implementation Details)
5. **src/pages/Login.js** - How login works
6. **src/pages/SchoolSignup.js** - How signup works
7. **src/utils/supabase.js** - Database connection
8. **src/utils/passwordReset.js** - Password reset logic

### REFERENCE (If Needed)
9. **src/pages/Students.js** - Example of school_id filtering
10. **.env.local** - Your environment variables (after you create it)

---

## The Complete Workflow Prompts

### Paste This ENTIRE Section to AI:

```
I'm starting a new React Ionic CMS project. Here's what I need:

FILES TO ANALYZE (read these first):
- package.json
- src/App.js
- src/pages/Login.js
- COMPLETE_SETUP_INSTRUCTIONS.md
- database_schema_multitenant.sql

BACKGROUND:
This is a multi-tenant school CMS that allows:
- Multiple schools to sign up
- Each school has its own data (isolated)
- Schools can upload logos
- Teachers login with email + password
- Admin teachers manage the school

I need you to help me:

PART 1: Understand the Project
- Read the files above
- Summarize the tech stack
- Explain what the app does

PART 2: Setup
- Tell me exact steps to set up database in Supabase
- Tell me what to put in .env.local
- Tell me why each step is needed

PART 3: Run Locally
- Give me commands to run
- Explain what each command does
- Tell me what to see when it's working

PART 4: Build APK
- Give me APK build commands
- Explain what APK is
- Tell me where the APK file ends up

PART 5: Push to GitHub
- Give me git commands
- Explain each command
- Tell me how to verify

FOR EACH STEP, SHOW:
- The exact command
- What it does
- What you should see
- What could go wrong and how to fix it

Start with PART 1.
```

---

## When AI Asks Questions

If the AI asks you questions, answer with:

**Q: "What's your Supabase URL?"**
A: `https://cwmbskmdqgsqbrfwfuen.supabase.co`

**Q: "What's your Supabase Anon Key?"**
A: Ask your team lead / check in Supabase dashboard Settings → API

**Q: "Do you have Node.js installed?"**
A: Run in terminal: `node --version`
(If nothing shows, install from nodejs.org)

**Q: "What database is this using?"**
A: Supabase (which is PostgreSQL)

**Q: "Have you created .env.local?"**
A: No, that's what I'm asking you to help me do

**Q: "Do you have Android SDK installed?"**
A: Only needed for APK building, not for running locally

---

## Summary: What to Tell AI

### SHORT VERSION (Copy This):
```
Help me set up this React Ionic CMS project:

1. First, read: package.json, src/App.js, COMPLETE_SETUP_INSTRUCTIONS.md
2. Tell me how to set up the Supabase database
3. Tell me what to put in .env.local
4. Give me the exact commands to run locally
5. Tell me how to build the APK
6. Tell me how to push to GitHub

For each step, explain what it does and what I should see.
```

### DETAILED VERSION (Copy This):
Use the "Complete Workflow Prompts" section above

---

## Terminal Commands You'll Run

After AI helps you understand, these are the ONLY commands you'll need:

```bash
# Database: Run in Supabase console (not terminal)
# Copy-paste all of database_schema_multitenant.sql into Supabase SQL Editor

# Terminal 1: Install dependencies
npm install

# Terminal 2: Start the app
npm start

# Terminal 3: Build for Android
npm run prepare:android
npm run build:mobile

# Terminal 4: Push to GitHub
git add .
git commit -m "feat: multi-tenant setup complete"
git push origin school-cms-app
```

---

## Quick Reference

| What | Command |
|-----|---------|
| Understand project | Ask AI to read package.json + App.js |
| Setup database | Run SQL in Supabase console |
| Create env file | Ask AI what variables to add |
| Install dependencies | `npm install` |
| Run locally | `npm start` |
| Build APK | `npm run prepare:android && npm run build:mobile` |
| Push to GitHub | `git add . && git commit -m "message" && git push origin school-cms-app` |

---

## AI Tool Recommendations in VSCode

If using these AI tools in VSCode:

1. **GitHub Copilot** - Good for code completion
2. **Codeium** - Free alternative
3. **ChatGPT/Claude in VSCode extensions** - Better for explanations

For each, paste the prompts above and it will guide you step-by-step.

---

## Expected Timeline

- **Database setup:** 5 minutes
- **Environment variables:** 5 minutes  
- **npm install:** 10 minutes
- **npm start:** 2 minutes (app will open in browser)
- **Testing:** 15 minutes
- **APK build:** 20-30 minutes
- **GitHub push:** 1 minute

**Total: About 60 minutes first time**

---

## After Setup is Complete

Once everything works:
1. ✅ App runs on http://localhost:3000
2. ✅ Can sign up new schools
3. ✅ Can login as school admin
4. ✅ Can see custom school logos
5. ✅ Can build APK for phone
6. ✅ Can push to GitHub

You're done! 🎉
