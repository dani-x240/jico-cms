import { supabase } from './supabase';
import crypto from 'crypto';

/**
 * Generate a secure random token for password reset
 * @returns {string} Random hex token (32+ chars)
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a reset token using SHA256
 * @param {string} token - The reset token to hash
 * @returns {string} Hashed token
 */
export const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validate reset token against stored hash
 * @param {string} token - The reset token from URL
 * @param {string} storedHash - The hashed token from database
 * @returns {boolean} True if token matches
 */
export const validateResetToken = (token, storedHash) => {
  const hashedToken = hashResetToken(token);
  return hashedToken === storedHash;
};

/**
 * Create password reset request for school admin
 * @param {string} email - School admin email
 * @returns {Promise<{success: boolean, message: string, token?: string}>}
 */
export const createSchoolPasswordReset = async (email) => {
  try {
    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('email', email)
      .single();

    if (schoolError || !school) {
      return { success: false, message: 'School not found' };
    }

    // Generate reset token
    const token = generateResetToken();
    const hashedToken = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store in password_resets table
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        email,
        user_type: 'school_admin',
        reset_token: hashedToken,
        school_id: school.id,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error('Error creating password reset:', insertError);
      return { success: false, message: 'Failed to create password reset' };
    }

    return { success: true, message: 'Password reset link created', token };
  } catch (error) {
    console.error('createSchoolPasswordReset error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Create password reset request for teacher
 * @param {string} email - Teacher email
 * @param {number} schoolId - School ID
 * @returns {Promise<{success: boolean, message: string, token?: string}>}
 */
export const createTeacherPasswordReset = async (email, schoolId) => {
  try {
    // Check if teacher exists
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', email)
      .eq('school_id', schoolId)
      .single();

    if (teacherError || !teacher) {
      return { success: false, message: 'Teacher not found' };
    }

    // Generate reset token
    const token = generateResetToken();
    const hashedToken = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store in password_resets table
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        email,
        user_type: 'teacher',
        reset_token: hashedToken,
        school_id: schoolId,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error('Error creating password reset:', insertError);
      return { success: false, message: 'Failed to create password reset' };
    }

    return { success: true, message: 'Password reset link created', token };
  } catch (error) {
    console.error('createTeacherPasswordReset error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Validate password reset token
 * @param {string} token - The reset token from URL
 * @returns {Promise<{valid: boolean, email?: string, userType?: string, schoolId?: number}>}
 */
export const validatePasswordResetToken = async (token) => {
  try {
    const hashedToken = hashResetToken(token);

    const { data: resetRecord, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('reset_token', hashedToken)
      .single();

    if (error || !resetRecord) {
      return { valid: false };
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      return { valid: false, message: 'Token has expired' };
    }

    return {
      valid: true,
      email: resetRecord.email,
      userType: resetRecord.user_type,
      schoolId: resetRecord.school_id
    };
  } catch (error) {
    console.error('validatePasswordResetToken error:', error);
    return { valid: false };
  }
};

/**
 * Reset school admin password
 * @param {string} email - School admin email
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const resetSchoolAdminPassword = async (email, newPassword) => {
  try {
    // Hash the new password
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update school password
    const { error: updateError } = await supabase
      .from('schools')
      .update({ password_hash: passwordHash })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, message: 'Failed to update password' };
    }

    // Delete the reset token (mark as used)
    await supabase
      .from('password_resets')
      .delete()
      .eq('email', email)
      .eq('user_type', 'school_admin');

    return { success: true, message: 'Password reset successful' };
  } catch (error) {
    console.error('resetSchoolAdminPassword error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Reset teacher password
 * @param {string} email - Teacher email
 * @param {number} schoolId - School ID
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const resetTeacherPassword = async (email, schoolId, newPassword) => {
  try {
    // Hash the new password
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update teacher password
    const { error: updateError } = await supabase
      .from('teachers')
      .update({ password: passwordHash })
      .eq('email', email)
      .eq('school_id', schoolId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, message: 'Failed to update password' };
    }

    // Delete the reset token (mark as used)
    await supabase
      .from('password_resets')
      .delete()
      .eq('email', email)
      .eq('user_type', 'teacher');

    return { success: true, message: 'Password reset successful' };
  } catch (error) {
    console.error('resetTeacherPassword error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Send password reset email (mock implementation)
 * In production, connect to SendGrid, Mailgun, or Supabase email service
 * @param {string} email - Recipient email
 * @param {string} resetLink - Full reset link URL
 * @param {string} schoolName - School name for personalization
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendPasswordResetEmail = async (email, resetLink, schoolName = 'Your School') => {
  try {
    // Mock email send - In production, use actual email service
    console.log('[MOCK EMAIL] Sending password reset email to:', email);
    console.log('[MOCK EMAIL] Reset link:', resetLink);
    console.log('[MOCK EMAIL] School:', schoolName);

    // TODO: Integrate with actual email service (SendGrid, Mailgun, etc.)
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({...});

    return { success: true, message: 'Password reset email sent' };
  } catch (error) {
    console.error('sendPasswordResetEmail error:', error);
    return { success: false, message: error.message };
  }
};
