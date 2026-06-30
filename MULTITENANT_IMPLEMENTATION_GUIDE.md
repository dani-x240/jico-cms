# Multi-Tenant CMS Implementation Guide

## Overview
This guide covers the conversion from a single-school (Jinja College) CMS to a multi-tenant system where each school signs up independently, manages their own data, and displays their own branding.

## Database Setup

### Step 1: Run the Migration Script
Execute the SQL script in your Supabase console:
```bash
# File: database_schema_multitenant.sql
```

This creates:
- `schools` table (new - tracks school registrations)
- `password_resets` table (new - tracks password reset tokens)
- Adds `school_id` column to all existing tables
- Adds `email` column to teachers table

## New Pages/Components

### 1. ForgotPassword.js
- Path: `/src/pages/ForgotPassword.js`
- Features:
  - Email input for password reset
  - Generates reset token and expiration
  - Mock email sending (integrate with SendGrid/Mailgun in production)
  - Success state showing email was sent

### 2. ResetPassword.js
- Path: `/src/pages/ResetPassword.js`
- Features:
  - Validates reset token from URL
  - New password form with confirmation
  - Password strength requirements
  - Success redirect to login

### 3. School Signup Page (Future)
- Will include fields:
  - School name (unique)
  - School admin email (unique)
  - Password
  - EMIS Number (unique - for verification)
  - Location (city/region/state)
  - Phone number
  - Full address
  - School logo upload (optional)

## Required Updates to Existing Components

### App.js Changes
1. Add routes for password reset pages
2. Update user state to store `school_id`
3. Add logic to handle password reset flow

### Login.js Changes
1. Change login from `staff_id` to `email`
2. Add "Forgot Password?" link
3. Create separate "School Signup" tab
4. Implement logo-based authentication flow

### All Data Pages Changes
1. Add `school_id` filter to all Supabase queries
2. Ensure data isolation per school
3. Update teacher assignments to use email instead of staff_id

### Settings Page Updates
1. Allow school admins to update school info
2. Logo upload and change functionality
3. Display current school information

### Sidebar Component
1. Display school logo (if provided) or fall back to default
2. Show school name in header
3. Update branding dynamically based on school

## Authentication Flow Changes

### Old Flow (Single School)
```
1. Staff ID + Password → Login
2. Search teachers table for staff_id
3. Verify password
4. Store user in localStorage
```

### New Flow (Multi-Tenant)
```
1. Determine if School Admin or Teacher
2. If School Admin:
   - Email + Password → Login
   - Search schools table for email
   - Verify password_hash
3. If Teacher:
   - Email + Password → Login
   - Search teachers table for email + school_id
   - Verify password

4. Store user + school_id in localStorage
5. All subsequent queries filter by school_id
```

## Password Reset Flow

```
1. User clicks "Forgot Password" on Login page
2. Enters email address
3. System generates reset token (expires in 1 hour)
4. Stores token in password_resets table
5. Sends email with reset link: /reset-password?token={token}
6. User clicks link → ResetPassword page validates token
7. User enters new password
8. System updates password_hash and deletes token
9. Redirect to login
```

## Logo Upload & Theming

### Storage Method
- Base64 encoding in `schools.logo_url` column
- No external storage needed

### Theming Implementation
1. On login, retrieve school logo
2. Pass logo through app context or props
3. Display logo in Sidebar header
4. Display logo in Dashboard
5. Use school name in page titles

## Data Isolation

### Key Principle
**Every query must filter by `school_id`**

### Query Pattern
```javascript
// ❌ WRONG - Gets data from all schools
const { data } = await supabase
  .from('students')
  .select('*');

// ✅ CORRECT - Gets only this school's data
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('school_id', user.school_id);
```

### Files That Need Updates
- App.js (all fetch calls)
- Dashboard.js
- Students.js
- Teachers.js
- Classes.js
- Attendance.js
- Reports pages
- Duty Management pages
- SMS Pages
- All other data-fetching pages

## Environment Variables

No new environment variables needed. Uses existing Supabase credentials.

## Testing Checklist

### School Signup
- [ ] Can create school with valid data
- [ ] EMIS number validation (unique)
- [ ] Logo upload works (stored as base64)
- [ ] Admin teacher created automatically
- [ ] School marked as 'active'

### School Admin Login
- [ ] Can login with school email + password
- [ ] Logo displays in sidebar
- [ ] School name shows in header
- [ ] All data belongs to this school only

### Password Reset
- [ ] Forgot password link works
- [ ] Email field validation
- [ ] Reset token generated
- [ ] Reset token expires after 1 hour
- [ ] Can set new password
- [ ] Password verified on next login

### Data Isolation
- [ ] School A's students don't appear in School B
- [ ] School A's teachers don't appear in School B
- [ ] Attendance records are school-specific
- [ ] Reports are school-specific

### Multi-School Testing
- [ ] Create School A with Logo A
- [ ] Create School B with Logo B
- [ ] Login as School A → see Logo A
- [ ] Login as School B → see Logo B
- [ ] Logout and verify separation

## Deployment Notes

### Before Going Live
1. Run database migration script
2. Test all password reset flows
3. Test multi-school data isolation
4. Verify logo upload works
5. Test login with email (not staff_id)
6. Backup existing data

### Production Checklist
- [ ] Email service configured (SendGrid, Mailgun, etc.)
- [ ] HTTPS enforced
- [ ] Database backups enabled
- [ ] Rate limiting on login attempts
- [ ] Password reset tokens are secure
- [ ] Logo upload has file size limits

## Rollback Plan

If issues occur:
1. Keep old database tables (don't drop them)
2. Old login flow still works if needed
3. Can pause new signups
4. Migrate data back to single school if needed

## Future Enhancements

- [ ] Email service integration (SendGrid, Mailgun)
- [ ] School branding customization (colors, fonts)
- [ ] Multi-admin support per school
- [ ] School billing/subscription
- [ ] Advanced reporting by school
- [ ] School-level analytics dashboard
