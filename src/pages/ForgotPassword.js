import React, { useState } from 'react';
import { ArrowLeft, Mail, Loader } from 'lucide-react';
import { createSchoolPasswordReset, sendPasswordResetEmail } from '../utils/passwordReset';
import logo from '../assets/logo.jpg';

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate email format
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Create password reset request
      const result = await createSchoolPasswordReset(email);

      if (!result.success) {
        setError(result.message || 'Could not find this email in our system');
        setLoading(false);
        return;
      }

      // Send password reset email (mock for now)
      const resetLink = `${window.location.origin}/reset-password?token=${result.token}`;
      await sendPasswordResetEmail(email, resetLink);

      setSuccess('Password reset link has been sent to your email. Please check your inbox (and spam folder) within the next hour.');
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {/* Header */}
        <div className="forgot-password-header">
          <button
            onClick={onBackToLogin}
            className="back-button"
            type="button"
            disabled={loading}
            title="Back to Login"
          >
            <ArrowLeft size={20} />
            Back to Login
          </button>
        </div>

        {/* Logo */}
        <div className="forgot-password-logo">
          <img src={logo} alt="School Logo" className="logo-image" />
        </div>

        {/* Title */}
        <h1 className="forgot-password-title">Forgot Password?</h1>
        <p className="forgot-password-subtitle">
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>

        {/* Success Message */}
        {submitted && success && (
          <div className="success-message">
            <Mail size={24} />
            <p>{success}</p>
            <button onClick={onBackToLogin} className="back-to-login-btn" type="button">
              Back to Login
            </button>
          </div>
        )}

        {/* Form */}
        {!submitted && (
          <form onSubmit={handleSubmit} className="forgot-password-form">
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.com"
                disabled={loading}
                required
              />
            </div>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email}
              className="submit-button"
            >
              {loading ? (
                <>
                  <Loader size={18} className="spinner" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Info */}
            <p className="info-text">
              The password reset link will expire after 1 hour for security reasons.
            </p>
          </form>
        )}
      </div>

      <style jsx>{`
        .forgot-password-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
            'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }

        .forgot-password-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 450px;
          width: 100%;
        }

        .forgot-password-header {
          margin-bottom: 30px;
        }

        .back-button {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 0;
          transition: color 0.2s;
        }

        .back-button:hover:not(:disabled) {
          color: #764ba2;
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .forgot-password-logo {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
        }

        .forgot-password-title {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px 0;
          text-align: center;
        }

        .forgot-password-subtitle {
          font-size: 14px;
          color: #666;
          text-align: center;
          margin: 0 0 30px 0;
          line-height: 1.6;
        }

        .forgot-password-form {
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

        .form-group input {
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

        .info-text {
          font-size: 12px;
          color: #999;
          text-align: center;
          margin: 0;
        }

        .success-message {
          background: #f0f9ff;
          border: 1px solid #bbeaf8;
          border-radius: 8px;
          padding: 30px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .success-message svg {
          color: #0284c7;
          flex-shrink: 0;
        }

        .success-message p {
          color: #0c4a6e;
          font-size: 14px;
          margin: 0;
          line-height: 1.6;
        }

        .back-to-login-btn {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .back-to-login-btn:hover {
          background: #764ba2;
        }

        @media (max-width: 600px) {
          .forgot-password-card {
            padding: 30px 20px;
          }

          .forgot-password-title {
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
