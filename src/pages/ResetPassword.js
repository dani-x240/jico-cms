import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { validatePasswordResetToken, resetSchoolAdminPassword, resetTeacherPassword } from '../utils/passwordReset';
import logo from '../assets/logo.jpg';

export default function ResetPassword({ onPasswordResetComplete, token }) {
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetData, setResetData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No reset token provided. Please use the link from your email.');
        setValidating(false);
        return;
      }

      try {
        const result = await validatePasswordResetToken(token);
        
        if (!result.valid) {
          setError(result.message || 'This password reset link is invalid or has expired. Please request a new one.');
          setValidating(false);
          return;
        }

        setTokenInfo(result);
        setTokenValid(true);
      } catch (err) {
        console.error('Token validation error:', err);
        setError('An error occurred while validating the reset link.');
      }
      setValidating(false);
    };

    validateToken();
  }, [token]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate password fields
      if (!resetData.newPassword || !resetData.confirmPassword) {
        setError('Both password fields are required');
        setLoading(false);
        return;
      }

      if (resetData.newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      if (resetData.newPassword !== resetData.confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        setLoading(false);
        return;
      }

      // Reset password based on user type
      let result;
      if (tokenInfo.userType === 'school_admin') {
        result = await resetSchoolAdminPassword(tokenInfo.email, resetData.newPassword);
      } else if (tokenInfo.userType === 'teacher') {
        result = await resetTeacherPassword(tokenInfo.email, tokenInfo.schoolId, resetData.newPassword);
      } else {
        throw new Error('Unknown user type');
      }

      if (!result.success) {
        setError(result.message || 'Failed to reset password');
        setLoading(false);
        return;
      }

      // Show success message and redirect after 2 seconds
      setSuccess(true);
      setTimeout(() => {
        onPasswordResetComplete();
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An error occurred while resetting your password. Please try again.');
    }
    setLoading(false);
  };

  // Loading state
  if (validating) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading-state">
            <Loader size={40} className="spinner" />
            <p>Validating reset link...</p>
          </div>
        </div>
        <style jsx>{`
          .reset-password-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
              'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }

          .reset-password-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 450px;
            width: 100%;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            text-align: center;
          }

          .loading-state svg {
            animation: spin 1s linear infinite;
            color: #667eea;
          }

          .loading-state p {
            color: #666;
            font-size: 14px;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Error state - Invalid token
  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-state">
            <AlertCircle size={48} />
            <h2>Reset Link Invalid</h2>
            <p>{error}</p>
            <button onClick={onPasswordResetComplete} className="primary-button">
              Back to Login
            </button>
          </div>
        </div>
        <style jsx>{`
          .reset-password-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
              'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }

          .reset-password-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 450px;
            width: 100%;
          }

          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            text-align: center;
          }

          .error-state svg {
            color: #ef4444;
          }

          .error-state h2 {
            color: #333;
            font-size: 24px;
            margin: 0;
          }

          .error-state p {
            color: #666;
            font-size: 14px;
            margin: 0;
            line-height: 1.6;
          }

          .primary-button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .primary-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
          }
        `}</style>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="success-state">
            <CheckCircle size={48} />
            <h2>Password Reset Successful</h2>
            <p>Your password has been successfully reset. Redirecting to login...</p>
          </div>
        </div>
        <style jsx>{`
          .reset-password-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
              'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }

          .reset-password-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 450px;
            width: 100%;
          }

          .success-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            text-align: center;
          }

          .success-state svg {
            color: #22c55e;
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
        `}</style>
      </div>
    );
  }

  // Form state
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        {/* Logo */}
        <div className="reset-password-logo">
          <img src={logo} alt="School Logo" className="logo-image" />
        </div>

        {/* Title */}
        <h1 className="reset-password-title">Reset Your Password</h1>
        <p className="reset-password-subtitle">
          Enter a new password for your {tokenInfo?.userType === 'school_admin' ? 'school admin' : 'teacher'} account.
        </p>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="reset-password-form">
          {/* New Password Input */}
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={resetData.newPassword}
                onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                placeholder="Enter new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-button"
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={resetData.confirmPassword}
                onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !resetData.newPassword || !resetData.confirmPassword}
            className="submit-button"
          >
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                Resetting...
              </>
            ) : (
              <>
                <Lock size={18} />
                Reset Password
              </>
            )}
          </button>

          {/* Password Requirements */}
          <div className="password-requirements">
            <p>Password must be:</p>
            <ul>
              <li>At least 6 characters long</li>
              <li>Match in both fields</li>
            </ul>
          </div>
        </form>
      </div>

      <style jsx>{`
        .reset-password-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
            'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }

        .reset-password-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 450px;
          width: 100%;
        }

        .reset-password-logo {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
        }

        .reset-password-title {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px 0;
          text-align: center;
        }

        .reset-password-subtitle {
          font-size: 14px;
          color: #666;
          text-align: center;
          margin: 0 0 30px 0;
          line-height: 1.6;
        }

        .reset-password-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .toggle-password-button {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .toggle-password-button:hover:not(:disabled) {
          opacity: 1;
        }

        .toggle-password-button:disabled {
          cursor: not-allowed;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          border-left: 4px solid #c33;
        }

        .submit-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
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

        .password-requirements {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          font-size: 12px;
          color: #666;
        }

        .password-requirements p {
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .password-requirements ul {
          margin: 0;
          padding-left: 20px;
          list-style: disc;
        }

        .password-requirements li {
          margin: 4px 0;
        }

        @media (max-width: 600px) {
          .reset-password-card {
            padding: 30px 20px;
          }

          .reset-password-title {
            font-size: 24px;
          }

          .logo-image {
            width: 60px;
            height: 60px;
          }
        }
      `}</style>
    </div>
  );
}
