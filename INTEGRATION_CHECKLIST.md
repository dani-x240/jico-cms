# Multi-Tenant Integration Checklist

## ✅ COMPLETED

### 1. App.js
- [x] Added imports for SchoolSignup, ForgotPassword, ResetPassword
- [x] Added authView state management
- [x] Added conditional rendering for auth views
- [x] Updated Login component props to include navigation handlers

### 2. Login.js  
- [x] Changed from staff_id to email login
- [x] Added school admin login support
- [x] Added "Forgot Password?" link (calls onNavigateToForgotPassword)
- [x] Added "Register your school" link (calls onNavigateToSchoolSignup)
- [x] Updated function signature to accept navigation props

### 3. New Pages Created
- [x] ForgotPassword.js - Email submission form
- [x] ResetPassword.js - Token validation and password reset
- [x] SchoolSignup.js - School registration with EMIS and logo upload

### 4. Utilities Created
- [x] passwordReset.js - Token generation, hashing, email utilities
- [x] logoUpload.js - Base64 encoding and logo management
- [x] SchoolSettings.js - School admin settings component

### 5. Database Schema
- [x] database_schema_multitenant.sql created with:
  - schools table
  - password_resets table
  - school_id columns added to all data tables

### 6. Students.js
- [x] loadStudents() - Added school_id filter

## ⚠️ TODO - DATA ISOLATION (Each page needs school_id filter)

### Teachers.js
```javascript
// In loadTeachers():
const schoolId = user.school_id || user.id;
const query = supabase.from('teachers').select('*').eq('school_id', schoolId);
// In handleSubmit():
const payload = { ...formData, school_id: schoolId };
```

### Classes.js
```javascript
// In loadClasses():
const schoolId = user.school_id || user.id;
const query = supabase.from('classes').select('*').eq('school_id', schoolId);
```

### Attendance.js
```javascript
// In loadAttendance():
const schoolId = user.school_id || user.id;
const query = supabase.from('attendance').select('*').eq('school_id', schoolId);
```

### MyReports.js, SubmitReport.js, ClassReports.js, AllReports.js, ReportsHub.js
```javascript
// In all report loading functions:
const schoolId = user.school_id || user.id;
const query = supabase.from('reports').select('*').eq('school_id', schoolId);
```

### DutyManagement.js, DutyDashboard.js
```javascript
// In duty loading functions:
const schoolId = user.school_id || user.id;
const query = supabase.from('duty_assignments').select('*').eq('school_id', schoolId);
```

### MyClass.js, SMSPage.js
```javascript
// Add school_id filtering to all data loads
const schoolId = user.school_id || user.id;
```

### Dashboard.js
```javascript
// In all stats loading functions:
const schoolId = user.school_id || user.id;
// Filter students, teachers, classes, attendance by school_id
```

## 🚀 NEXT STEPS

1. **Run Database Migration**
   ```bash
   # Open Supabase SQL Editor and run:
   # Copy contents of database_schema_multitenant.sql
   ```

2. **Apply Data Isolation to All Pages**
   - Use the DATA_ISOLATION_UPDATE_GUIDE.md for reference
   - Follow the pattern for each page
   - Test thoroughly with multiple schools

3. **Update Dashboard to Show School Logo**
   - Read school logo from localStorage or user object
   - Display in sidebar and dashboard header
   - Fall back to default Jinja logo if none provided

4. **Update Settings Page**
   - Import SchoolSettings component
   - Allow school admins to update logo and school info
   - Ensure only admins can access

5. **Test Multi-Tenant Flow**
   - Create School A with admin user
   - Create School B with admin user
   - Verify data isolation
   - Test cross-school access (should fail)

6. **Generate APK**
   ```bash
   npm run prepare:android
   npm run build:mobile
   ```

## Key Implementation Notes

### School ID Extraction
```javascript
// For users (teachers)
const schoolId = user.school_id || user.id;

// For school admins
const schoolId = user.school_id;  // Set during signup
```

### User Objects
**Teacher User:**
```javascript
{
  id: "teacher-uuid",
  email: "teacher@school.com",
  name: "John Teacher",
  role: "teacher",
  school_id: "school-uuid",
  approved: true
}
```

**School Admin User:**
```javascript
{
  id: "school-uuid",
  email: "admin@school.com",
  name: "School Name",
  role: "admin",
  school_id: "school-uuid",
  school_name: "School Name",
  school_logo: "base64-logo-or-url"
}
```

### Logo Display Logic
```javascript
const logo = user.school_logo || require('../assets/logo.jpg');
// Display logo in sidebar and dashboard header
```

## Testing Commands
```bash
# Start dev server
npm start

# Build for mobile
npm run prepare:android
npm run build:mobile
```

## Database Migration
File: `/database_schema_multitenant.sql`
- Creates `schools` table
- Creates `password_resets` table
- Adds `school_id` to all data tables
- Adds `email` to teachers table
- Creates necessary indexes

Run this in Supabase SQL Editor before deploying app.
