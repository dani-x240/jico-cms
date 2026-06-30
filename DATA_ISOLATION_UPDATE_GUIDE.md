# Data Isolation Update Guide (School ID Filtering)

## Overview
All data pages must add `school_id` filtering to ensure multi-tenant data isolation. Each school only sees their own data.

## Implementation Pattern

### Basic Pattern
Every Supabase query that reads data must filter by `school_id`:

```javascript
const schoolId = user.school_id || user.id;
const { data, error } = await supabase
  .from('tableName')
  .select('*')
  .eq('school_id', schoolId)  // ADD THIS LINE
  .order('field');
```

### For Insert/Update Operations
Include `school_id` in the payload:

```javascript
const schoolId = user.school_id || user.id;
const { data, error } = await supabase
  .from('students')
  .insert({
  ...formData,
    school_id: schoolId  // ADD THIS LINE
  });
```

## Pages to Update

### 1. **Students.js** ✅ DONE
- loadStudents() - Add `.eq('school_id', schoolId)` after `.select('*')`
- handleSubmit() - Add `school_id: schoolId` to insert/update payload
- handleDelete() - No change needed (deletes by ID)
- handleBulkImport() - Add `school_id` to imported records

### 2. **Teachers.js**
- loadTeachers() - Filter teachers by school_id
- handleSubmit() - Add school_id to insert/update
- handleDelete() - No change needed

### 3. **Classes.js**
- loadClasses() - Filter by school_id
- handleSubmit() - Add school_id to insert/update

### 4. **Attendance.js**
- loadAttendance() - Filter by school_id
- handleSubmit() - Add school_id when recording attendance

### 5. **SubmitReport.js**
- loadClasses() / loadStudents() - Filter by school_id
- handleSubmit() - Add school_id to report

### 6. **MyReports.js**
- loadReports() - Filter by school_id

### 7. **MyClass.js**
- loadClassData() - Filter by school_id

### 8. **SMSPage.js**
- loadStudents() / loadClasses() - Filter by school_id

### 9. **ClassReports.js**
- loadReports() - Filter by school_id

### 10. **DutyManagement.js**
- loadDuties() - Filter by school_id
- handleSubmit() - Add school_id

### 11. **DutyDashboard.js**
- loadDuties() - Filter by school_id

### 12. **ReportsHub.js**
- loadReports() - Filter by school_id

### 13. **AllReports.js** (Admin only)
- loadReports() - Filter by school_id

### 14. **Dashboard.js**
- loadStats() - Filter all data tables by school_id

### 15. **Settings.js**
- No changes needed (per-user settings)

## Quick Update Pattern

Find every line with:
```
.from('tableName').select(
```

And immediately after `.select('*')`, add:
```
.eq('school_id', schoolId)
```

## Testing Checklist
- [ ] After signup, verify only that school's data is visible
- [ ] Create test students in School A and School B
- [ ] Login as admin from School A - see only School A students
- [ ] Login as admin from School B - see only School B students
- [ ] No cross-school data leakage

## Database Schema
The `school_id` column has been added to:
- teachers
- students
- classes
- attendance
- reports
- duty_assignments
- sms_logs

All with FK constraint to schools(id).
