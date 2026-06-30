import React, { useState, useEffect } from 'react';
import { Save, Camera, Trash2, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { handleLogoFileSelect, uploadSchoolLogo, removeSchoolLogo } from '../utils/logoUpload';

export default function SchoolSettings({ user, onSettingsUpdate }) {
  const [loading, setLoading] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    schoolName: '',
    location: '',
    address: '',
    phone: '',
    emisNumber: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Load school data on mount
  useEffect(() => {
    if (user?.school_id) {
      loadSchoolData(user.school_id);
    }
  }, [user?.school_id]);

  const loadSchoolData = async (schoolId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (fetchError) {
        setError('Failed to load school data');
        return;
      }

      setSchoolData(data);
      setFormData({
        schoolName: data.name || '',
        location: data.location || '',
        address: data.address || '',
        phone: data.phone || '',
        emisNumber: data.emis_number || ''
      });

      // Set logo preview if it exists
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
    } catch (err) {
      console.error('Error loading school data:', err);
      setError('Failed to load school information');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleLogoSelect = async (e) => {
    setError('');
    const result = await handleLogoFileSelect(e);

    if (!result.valid) {
      setError(result.error);
      return;
    }

    setLogoPreview(result.preview);
    setLogoBase64(result.base64);
    setLogoChanged(true);
    setHasChanges(true);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoBase64(null);
    setLogoChanged(true);
    setHasChanges(true);
  };

  const validateForm = () => {
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return false;
    }

    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    return true;
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Update school info
      const updateData = {
        name: formData.schoolName,
        location: formData.location,
        address: formData.address,
        phone: formData.phone
      };

      // Add logo if it changed
      if (logoChanged) {
        updateData.logo_url = logoBase64 || null;
      }

      const { error: updateError } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', user.school_id);

      if (updateError) {
        setError(updateError.message || 'Failed to save settings');
        setLoading(false);
        return;
      }

      setSuccess('School settings updated successfully');
      setHasChanges(false);
      setLogoChanged(false);

      // Reload school data
      if (user?.school_id) {
        await loadSchoolData(user.school_id);
      }

      // Notify parent component
      if (onSettingsUpdate) {
        onSettingsUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message || 'An error occurred while saving settings');
    }
    setLoading(false);
  };

  // Only show settings for admin users
  if (user?.role !== 'admin') {
    return (
      <div className="settings-restricted">
        <AlertCircle size={32} />
        <p>School settings are only available to administrators</p>
      </div>
    );
  }

  return (
    <div className="school-settings">
      <div className="settings-header">
        <h2>School Settings</h2>
        <p>Manage your school information and branding</p>
      </div>

      <form onSubmit={handleSaveSettings} className="settings-form">
        {/* School Logo Section */}
        <div className="settings-section">
          <h3>School Logo</h3>
          <div className="logo-settings">
            {logoPreview ? (
              <div className="logo-preview">
                <img src={logoPreview} alt="School logo" />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="btn-remove-logo"
                  disabled={loading}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            ) : (
              <div className="logo-placeholder">
                <Camera size={32} />
                <p>No logo set</p>
              </div>
            )}

            <div className="logo-upload-section">
              <label className="logo-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <div className="btn-upload">
                  <Camera size={18} />
                  Upload New Logo
                </div>
              </label>
              <small>PNG, JPG, GIF or WebP (max 500KB)</small>
            </div>
          </div>
        </div>

        {/* School Information Section */}
        <div className="settings-section">
          <h3>School Information</h3>

          {/* School Name */}
          <div className="form-group">
            <label>School Name</label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              placeholder="e.g., Jinja College"
              disabled={loading}
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location (City/Region)</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Jinja, Uganda"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+256700000000"
              disabled={loading}
            />
          </div>

          {/* Address */}
          <div className="form-group">
            <label>Full Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Full physical address of school"
              disabled={loading}
              rows="3"
            />
          </div>

          {/* EMIS Number - Read Only */}
          <div className="form-group">
            <label>EMIS Number (Read-Only)</label>
            <input
              type="text"
              value={formData.emisNumber}
              disabled={true}
              title="EMIS number cannot be changed"
            />
            <small>This field cannot be modified for security reasons</small>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* Save Button */}
        <div className="settings-actions">
          <button
            type="submit"
            disabled={!hasChanges || loading}
            className="btn-save"
          >
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
          {!hasChanges && (
            <p className="no-changes-text">No unsaved changes</p>
          )}
        </div>
      </form>

      <style jsx>{`
        .school-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .settings-header {
          margin-bottom: 32px;
        }

        .settings-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin: 0 0 8px 0;
        }

        .settings-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .settings-section {
          background: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 24px;
        }

        .settings-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0 0 16px 0;
        }

        .logo-settings {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .logo-preview,
        .logo-placeholder {
          width: 150px;
          height: 150px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #e0e0e0;
          position: relative;
          flex-shrink: 0;
        }

        .logo-preview {
          background: #f5f5f5;
          padding: 8px;
        }

        .logo-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }

        .logo-placeholder {
          background: #f0f0f0;
          color: #999;
          flex-direction: column;
          gap: 8px;
        }

        .logo-placeholder p {
          margin: 0;
          font-size: 13px;
        }

        .btn-remove-logo {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          transition: background 0.2s;
        }

        .btn-remove-logo:hover:not(:disabled) {
          background: #dd0000;
        }

        .btn-remove-logo:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .logo-upload-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .logo-upload-label {
          display: block;
        }

        .btn-upload {
          padding: 12px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .btn-upload:hover {
          background: #764ba2;
        }

        .logo-upload-section small {
          font-size: 12px;
          color: #999;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
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
          color: #999;
        }

        .form-group small {
          font-size: 12px;
          color: #999;
        }

        .alert {
          padding: 12px 14px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .alert-error {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
          border-left: 3px solid #c33;
        }

        .alert-success {
          background: #efe;
          color: #3c3;
          border: 1px solid #cfc;
          border-left: 3px solid #3c3;
        }

        .settings-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-save {
          padding: 11px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-save:disabled {
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

        .no-changes-text {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .settings-restricted {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 60px 24px;
          text-align: center;
          color: #666;
        }

        .settings-restricted svg {
          color: #999;
        }

        @media (max-width: 600px) {
          .school-settings {
            padding: 16px;
          }

          .settings-section {
            padding: 16px;
          }

          .logo-settings {
            flex-direction: column;
            align-items: center;
          }

          .logo-preview,
          .logo-placeholder {
            width: 120px;
            height: 120px;
          }
        }
      `}</style>
    </div>
  );
}
