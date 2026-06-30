-- MULTI-TENANT DATABASE SCHEMA FOR JINJA CMS
-- Run this in Supabase SQL Editor to upgrade the single-school database to multi-tenant
-- This script adds a schools table, password_resets table, and school_id to all existing tables

-- ============================================
-- 1. SCHOOLS TABLE (NEW - Multi-tenant support)
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  emis_number TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  logo_url TEXT,
  school_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. PASSWORD RESETS TABLE (NEW - Track password reset requests)
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('school_admin', 'teacher')),
  reset_token TEXT UNIQUE NOT NULL,
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ALTER EXISTING TABLES TO ADD SCHOOL_ID
-- ============================================

-- Add school_id to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to duty_assignments table
ALTER TABLE duty_assignments ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to lesson_reports table
ALTER TABLE lesson_reports ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to stream_reports table
ALTER TABLE stream_reports ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to consolidated_reports table
ALTER TABLE consolidated_reports ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- Add school_id to sms_logs table
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE;

-- ============================================
-- UPDATE TEACHER LOGIN METHOD
-- ============================================
-- Add email column to teachers (for email-based login instead of staff_id)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
-- Make email field (will populate existing teachers with a generated email)
UPDATE teachers SET email = CONCAT(LOWER(REPLACE(name, ' ', '.')), '_', staff_id, '@teacher.local') WHERE email IS NULL;

-- ============================================
-- CREATE INDEXES FOR MULTI-TENANT PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_schools_email ON schools(email);
CREATE INDEX IF NOT EXISTS idx_schools_emis_number ON schools(emis_number);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_school_email ON teachers(school_id, email);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class);

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_name ON classes(school_id, name);

CREATE INDEX IF NOT EXISTS idx_duty_school_id ON duty_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_duty_school_teacher ON duty_assignments(school_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_lesson_reports_school_id ON lesson_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reports_school_date ON lesson_reports(school_id, report_date);

CREATE INDEX IF NOT EXISTS idx_stream_reports_school_id ON stream_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_stream_reports_school_date ON stream_reports(school_id, report_date);

CREATE INDEX IF NOT EXISTS idx_consolidated_school_id ON consolidated_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_school_week ON consolidated_reports(school_id, week_start);

CREATE INDEX IF NOT EXISTS idx_sms_logs_school_id ON sms_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_school_date ON sms_logs(school_id, sent_date);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- ============================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Create basic policies (can be refined later for production security)
CREATE POLICY "Allow all on schools" ON schools FOR ALL USING (true);
CREATE POLICY "Allow all on password_resets" ON password_resets FOR ALL USING (true);

-- ============================================
-- CREATE FUNCTION TO CLEAN UP EXPIRED RESET TOKENS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_resets WHERE expires_at < NOW();
  UPDATE schools SET password_reset_token = NULL, password_reset_expires_at = NULL WHERE password_reset_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER TO AUTO-UPDATE schools.updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trigger_schools_updated_at ON schools;
CREATE TRIGGER trigger_schools_updated_at
BEFORE UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_schools_updated_at();

-- ============================================
-- MIGRATION NOTE FOR EXISTING DATA
-- ============================================
-- If migrating existing Jinja College data:
-- 1. Insert default school: INSERT INTO schools (name, email, password_hash, emis_number, phone, location, address) 
--    VALUES ('Jinja College', 'admin@jinja.local', '<hashed_password>', 'JINJA001', '+256700000000', 'Jinja', 'Jinja, Uganda');
-- 2. Get the inserted school_id
-- 3. Update all existing records: UPDATE teachers SET school_id = <school_id>;
-- 4. Repeat for all other tables

-- For fresh start (new database), omit the above steps - schools will be created during signup process
