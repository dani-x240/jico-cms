import React, { useState } from 'react';
import { Upload, Loader, X, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { handleLogoFileSelect, uploadSchoolLogo } from '../utils/logoUpload';
import logo from '../assets/logo.jpg';

export default function SchoolSignup({ onBackToLogin, onSignupSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  const [formData, setFormData] = useState({
    schoolName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    emisNumber: '',
    location: '',
    phone: '',
    address: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoSelect = async (e) => {
    setError('');
    const result = await handleLogoFileSelect(e);

    if (!result.valid) {
      setError(result.error);
      setLogoPreview(null);
      setLogoBase64(null);
      return;
    }

    setLogoPreview(result.preview);
    setLogoBase64(result.base64);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoBase64(null);
  };

  const validateForm = () => {
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return false;
    }

    if (!formData.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      setError('Valid email address is required');
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!formData.emisNumber.trim()) {
      setError('EMIS Number is required');
      return false;
    }

    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Hash password (simple SHA256 - in production use bcrypt)
      const crypto = require('crypto');
      const passwordHash = crypto.createHash('sha256').update(formData.password).digest('hex');

      // Create school record
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: formData.schoolName,
          email: formData.adminEmail,
          password_hash: passwordHash,
          emis_number: formData.emisNumber,
          phone: formData.phone,
          location: formData.location,
          address: formData.address,
          logo_url: logoBase64 || null,
          status: 'active'
        })
        .select()
        .single();

      if (schoolError) {
        setError(schoolError.message || 'Failed to create school');
        setLoading(false);
        return;
      }

      // Create admin teacher for the school
      const { error: teacherError } = await supabase
        .from('teachers')
        .insert({
          email: formData.adminEmail,
          name: 'School Administrator',
          phone: formData.phone,
          subjects: 'All',
          password: formData.password,
          role: 'admin',
          approved: true,
          school_id: schoolData.id,
          staff_id: 'admin_' + schoolData.id // Generate unique staff_id
        });

      if (teacherError) {
        setError(teacherError.message || 'Failed to create admin account');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSignupSuccess(schoolData);
      }, 2000);
    } catch (err) {
      console.error('School signup error:', err);
      setError(err.message || 'An error occurred during signup');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="school-signup-container">
        <div className="school-signup-card">
          <div className="success-state">
            <CheckCircle size={60} className="success-icon" />
            <h2>School Created Successfully!</h2>
            <p>Your school has been registered. Redirecting to login...</p>
          </div>
        </div>
        <style jsx>{`
          .school-signup-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .school-signup-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            padding: 60px 40px;
            max-width: 500px;
            width: 100%;
          }

          .success-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            text-align: center;
          }

          .success-icon {
            color: #22c55e;
            animation: scaleIn 0.6s ease-out;
          }

          .success-state h2 {
            color: #333;
            font-size: 24px;
            margin: 0;
          }

          .success-state p {
            color: #666;
            font-size: 14px;
            margin: 0;
          }

          @keyframes scaleIn {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="school-signup-container">
      <div className="school-signup-card">
        {/* Header */}
        <button
          onClick={onBackToLogin}
          className="back-button"
          type="button"
          disabled={loading}
        >
          ← Back to Login
        </button>

        {/* Logo */}
        <div className="signup-logo">
          <img src={logo} alt="CMS Logo" />
        </div>

        {/* Title */}
        <h1 className="signup-title">Register Your School</h1>
        <p className="signup-subtitle">
          Create a new school account and start managing your institution
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          {/* School Name */}
          <div className="form-group">
            <label>School Name *</label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              placeholder="e.g., Jinja College"
              disabled={loading}
              required
            />
          </div>

          {/* Admin Email */}
          <div className="form-group">
            <label>Admin Email Address *</label>
            <input
              type="email"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleInputChange}
              placeholder="admin@school.com"
              disabled={loading}
              required
            />
          </div>

          {/* EMIS Number */}
          <div className="form-group">
            <label>EMIS Number *</label>
            <input
              type="text"
              name="emisNumber"
              value={formData.emisNumber}
              onChange={handleInputChange}
              placeholder="e.g., JINJA001"
              disabled={loading}
              required
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location (City/Region) *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Jinja, Uganda"
              disabled={loading}
              required
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+256700000000"
              disabled={loading}
              required
            />
          </div>

          {/* Address */}
          <div className="form-group">
            <label>Full Address *</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Full physical address of school"
              disabled={loading}
              rows="2"
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="At least 6 characters"
              disabled={loading}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter password"
              disabled={loading}
              required
            />
          </div>

          {/* Logo Upload */}
          <div className="form-group">
            <label>School Logo (Optional)</label>
            {!logoPreview ? (
              <label className="logo-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <div className="logo-upload-box">
                  <Upload size={32} />
                  <p>Click to upload school logo</p>
                  <small>PNG, JPG, GIF or WebP (max 500KB)</small>
                </div>
              </label>
            ) : (
              <div className="logo-preview-box">
                <img src={logoPreview} alt="Logo preview" />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="remove-logo-btn"
                  disabled={loading}
                >
                  <X size={16} />
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                Creating School...
              </>
            ) : (
              'Register School'
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .school-signup-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .school-signup-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .back-button {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 0;
          margin-bottom: 20px;
          transition: color 0.2s;
        }

        .back-button:hover:not(:disabled) {
          color: #764ba2;
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .signup-logo {
          text-align: center;
          margin-bottom: 24px;
        }

        .signup-logo img {
          width: 70px;
          height: 70px;
          border-radius: 8px;
          object-fit: cover;
        }

        .signup-title {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin: 0 0 8px 0;
          text-align: center;
        }

        .signup-subtitle {
          font-size: 14px;
          color: #666;
          text-align: center;
          margin: 0 0 24px 0;
          line-height: 1.6;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .form-group input,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input:disabled,
        .form-group textarea:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .logo-upload-label {
          cursor: pointer;
        }

        .logo-upload-box {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          transition: border-color 0.2s, background-color 0.2s;
          cursor: pointer;
        }

        .logo-upload-box:hover {
          border-color: #667eea;
          background-color: rgba(102, 126, 234, 0.05);
        }

        .logo-upload-box svg {
          color: #667eea;
          margin-bottom: 8px;
        }

        .logo-upload-box p {
          margin: 8px 0 4px 0;
          font-size: 13px;
          font-weight: 500;
          color: #333;
        }

        .logo-upload-box small {
          display: block;
          color: #999;
          font-size: 12px;
        }

        .logo-preview-box {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        .logo-preview-box img {
          width: 100%;
          max-width: 200px;
          height: auto;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .remove-logo-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          transition: background 0.2s;
        }

        .remove-logo-btn:hover:not(:disabled) {
          background: #dd0000;
        }

        .remove-logo-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 13px;
          border-left: 3px solid #c33;
        }

        .submit-button {
          padding: 11px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          .school-signup-card {
            padding: 24px 16px;
          }

          .signup-title {
            font-size: 22px;
          }

          .signup-logo img {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
}
