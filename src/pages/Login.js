import React, { useEffect, useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../utils/supabase';
import logo from '../assets/logo.jpg';
import {
  SECURITY_QUESTIONS,
  buildSecurityQuestionPayload,
  createEmptySecurityQuestionState,
  getSecurityQuestionSchemaMessage,
  hasSecurityQuestionsConfigured,
  isSecurityQuestionSchemaMissing,
  normalizeSecurityAnswer,
  validateSecurityQuestionState
} from '../utils/securityQuestions';

export default function Login({ onLogin, onNavigateToSchoolSignup, onNavigateToForgotPassword, securityQuestionsEnabled, refreshSecurityQuestionAvailability }) {
  const FAILED_LOGIN_ATTEMPTS_KEY = 'failedLoginAttempts';
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(() => {
    const savedAttempts = Number(localStorage.getItem(FAILED_LOGIN_ATTEMPTS_KEY));
    return Number.isFinite(savedAttempts) ? savedAttempts : 0;
  });

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [signupData, setSignupData] = useState({
    staff_id: '',
    name: '',
    phone: '',
    subjects: '',
    password: '',
    confirmPassword: '',
    ...createEmptySecurityQuestionState()
  });
  const [recoveryUser, setRecoveryUser] = useState(null);
  const [recoveryData, setRecoveryData] = useState({
    staff_id: '',
    answer1: '',
    answer2: ''
  });

  useEffect(() => {
    if (!securityQuestionsEnabled && refreshSecurityQuestionAvailability) {
      refreshSecurityQuestionAvailability();
    }
  }, [securityQuestionsEnabled, refreshSecurityQuestionAvailability]);

  useEffect(() => {
    localStorage.setItem(FAILED_LOGIN_ATTEMPTS_KEY, String(failedLoginAttempts));
  }, [failedLoginAttempts]);

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const changeView = (nextView) => {
    setView(nextView);
    setRecoveryUser(null);
    setRecoveryData({ staff_id: '', answer1: '', answer2: '' });
    setFailedLoginAttempts(0);
    resetFeedback();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      // First try teacher login with email
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', loginData.email)
        .single();

      if (!error && data) {
        // Teacher found, validate password
        if (!data.approved) {
          setError('⚠️ ACCOUNT PENDING APPROVAL\n\nYour account is waiting for administrator approval. You cannot login at this time.\n\nYou will be notified when approved.');
          setFailedLoginAttempts((previous) => previous + 1);
          setLoading(false);
          return;
        }

        if (data.password === loginData.password) {
          setFailedLoginAttempts(0);
          localStorage.removeItem(FAILED_LOGIN_ATTEMPTS_KEY);
          localStorage.setItem('user', JSON.stringify(data));
          onLogin(data);
        } else {
          setError('Invalid email or password');
          setFailedLoginAttempts((previous) => previous + 1);
        }
      } else {
        // Try school admin login
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('email', loginData.email)
          .single();

        if (!schoolError && schoolData) {
          // School admin found
          if (schoolData.password_hash === loginData.password) {
            setFailedLoginAttempts(0);
            localStorage.removeItem(FAILED_LOGIN_ATTEMPTS_KEY);
            // Create user object for school admin
            const schoolAdminUser = {
              id: schoolData.id,
              email: schoolData.email,
              name: schoolData.name,
              role: 'admin',
              school_id: schoolData.id,
              school_name: schoolData.name,
              school_logo: schoolData.logo_url
            };
            localStorage.setItem('user', JSON.stringify(schoolAdminUser));
            onLogin(schoolAdminUser);
          } else {
            setError('Invalid email or password');
            setFailedLoginAttempts((previous) => previous + 1);
          }
        } else {
          setError('Invalid email or password');
          setFailedLoginAttempts((previous) => previous + 1);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed: ' + err.message);
      setFailedLoginAttempts((previous) => previous + 1);
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    if (!signupData.staff_id || !signupData.name || !signupData.phone || !signupData.subjects || !signupData.password || !signupData.confirmPassword) {
      setError('⚠️ All fields are required. Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (signupData.password.length < 6) {
      setError('⚠️ Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('⚠️ Passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    if (securityQuestionsEnabled) {
      const securityValidationError = validateSecurityQuestionState(signupData);
      if (securityValidationError) {
        setError(`⚠️ ${securityValidationError}`);
        setLoading(false);
        return;
      }
    }

    try {
      console.log('Step 1: Checking if Staff ID exists...');
      const { data: existing, error: checkError } = await supabase
        .from('teachers')
        .select('staff_id')
        .eq('staff_id', signupData.staff_id)
        .maybeSingle();

      if (checkError) {
        console.error('Check error:', checkError);
        setError('⚠️ Database error: ' + checkError.message);
        setLoading(false);
        return;
      }

      if (existing) {
        setError('⚠️ Staff ID already exists. Please choose a different Staff ID.');
        setLoading(false);
        return;
      }

      console.log('Step 2: Counting existing users...');
      const { count, error: countError } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Count error:', countError);
        setError('⚠️ Database error: ' + countError.message);
        setLoading(false);
        return;
      }

      const isFirstUser = count === 0;
      console.log('Is first user:', isFirstUser, 'Total users:', count);

      const teacherPayload = {
        staff_id: signupData.staff_id,
        name: signupData.name,
        phone: signupData.phone,
        subjects: signupData.subjects,
        password: signupData.password,
        role: isFirstUser ? 'admin' : 'teacher',
        approved: isFirstUser ? true : false,
        class_assigned: null
      };

      console.log('Step 3: Creating account...');
      const { data: createdUser, error: insertError } = await supabase
        .from('teachers')
        .insert({
          ...teacherPayload,
          ...(securityQuestionsEnabled ? buildSecurityQuestionPayload(signupData) : {})
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);

        if (isSecurityQuestionSchemaMissing(insertError)) {
          const { data: fallbackUser, error: fallbackError } = await supabase
            .from('teachers')
            .insert(teacherPayload)
            .select('*')
            .single();

          if (fallbackError) {
            setError('⚠️ Failed to create account: ' + fallbackError.message);
            setLoading(false);
            return;
          }

          if (isFirstUser) {
            localStorage.setItem('user', JSON.stringify(fallbackUser));
            onLogin(fallbackUser);
          } else {
            setSuccess('✅ Account created, but recovery questions are not active yet. Ask the administrator to run add_security_questions.sql, then you can add recovery questions after login.');
            setTimeout(() => changeView('login'), 7000);
          }

          setSignupData({
            staff_id: '',
            name: '',
            phone: '',
            subjects: '',
            password: '',
            confirmPassword: '',
            ...createEmptySecurityQuestionState()
          });
          setLoading(false);
          return;
        }

        setError('⚠️ Failed to create account: ' + insertError.message);
        setLoading(false);
        return;
      }

      console.log('SUCCESS! Account created.');

      if (isFirstUser) {
        localStorage.setItem('user', JSON.stringify(createdUser));
        onLogin(createdUser);
      } else {
        setSuccess('✅ REGISTRATION SUBMITTED SUCCESSFULLY!\n\nYour account has been created and is now PENDING ADMINISTRATOR APPROVAL.\n\nYou will receive notification once an administrator approves your account.\n\nYOU CANNOT LOGIN UNTIL APPROVED.\n\nRedirecting to login page...');
        setTimeout(() => changeView('login'), 10000);
      }

      setSignupData({
        staff_id: '',
        name: '',
        phone: '',
        subjects: '',
        password: '',
        confirmPassword: '',
        ...createEmptySecurityQuestionState()
      });
    } catch (err) {
      console.error('Signup error:', err);
      setError('⚠️ Signup failed: ' + (err.message || 'Unknown error. Check console for details.'));
    }
    setLoading(false);
  };

  const handleRecoveryLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    if (!securityQuestionsEnabled) {
      const isAvailable = refreshSecurityQuestionAvailability
        ? await refreshSecurityQuestionAvailability()
        : false;

      if (!isAvailable) {
        setError(getSecurityQuestionSchemaMessage());
        setLoading(false);
        return;
      }

    }

    try {
      const { data, error: lookupError } = await supabase
        .from('teachers')
        .select('*')
        .eq('staff_id', recoveryData.staff_id)
        .maybeSingle();

      if (lookupError) {
        if (isSecurityQuestionSchemaMissing(lookupError)) {
          setError(getSecurityQuestionSchemaMessage());
        } else {
          setError('No account was found with that Staff ID.');
        }
        setLoading(false);
        return;
      }

      if (!data) {
        setError('No account was found with that Staff ID.');
        setLoading(false);
        return;
      }

      if (!data.approved) {
        setError('This account is still pending approval and cannot use password recovery yet.');
        setLoading(false);
        return;
      }

      if (!hasSecurityQuestionsConfigured(data)) {
        setError('This account has no recovery questions yet. Please sign in normally and complete the security setup, or contact the administrator.');
        setLoading(false);
        return;
      }

      setRecoveryUser(data);
      setSuccess('Answer your recovery questions correctly to continue.');
    } catch (err) {
      setError('Recovery lookup failed: ' + err.message);
    }

    setLoading(false);
  };

  const openForgotPassword = async () => {
    resetFeedback();

    if (refreshSecurityQuestionAvailability) {
      const isAvailable = await refreshSecurityQuestionAvailability();

      if (!isAvailable) {
        setError(getSecurityQuestionSchemaMessage());
        return;
      }
    } else if (!securityQuestionsEnabled) {
      setError(getSecurityQuestionSchemaMessage());
      setLoading(false);
      return;
    }

    changeView('forgot');
  };

  const handleRecoveryLogin = async (e) => {
    e.preventDefault();
    resetFeedback();

    if (!recoveryUser) {
      setError('Start by entering your Staff ID.');
      return;
    }

    const firstAnswerMatches = normalizeSecurityAnswer(recoveryData.answer1) === recoveryUser.security_answer_1;
    const secondAnswerMatches = normalizeSecurityAnswer(recoveryData.answer2) === recoveryUser.security_answer_2;

    if (!firstAnswerMatches || !secondAnswerMatches) {
      setError('The answers did not match your saved recovery questions.');
      return;
    }

    localStorage.setItem('passwordResetRequired', 'true');
    localStorage.setItem('user', JSON.stringify(recoveryUser));
    onLogin(recoveryUser);
  };

  const renderSecurityQuestionFields = (data, onChange) => (
    <>
      <div style={{ padding: '12px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
        Choose two questions you can answer easily. You will use them if you forget your password.
      </div>

      <div className="form-group">
        <label className="form-label">Security Question 1</label>
        <select
          className="form-input"
          value={data.securityQuestion1}
          onChange={(e) => onChange('securityQuestion1', e.target.value)}
          required
        >
          <option value="">Select a question</option>
          {SECURITY_QUESTIONS.map((question) => (
            <option key={question} value={question}>{question}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Answer 1</label>
        <input
          type="text"
          className="form-input"
          value={data.securityAnswer1}
          onChange={(e) => onChange('securityAnswer1', e.target.value)}
          placeholder="Enter your answer"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Security Question 2</label>
        <select
          className="form-input"
          value={data.securityQuestion2}
          onChange={(e) => onChange('securityQuestion2', e.target.value)}
          required
        >
          <option value="">Select a different question</option>
          {SECURITY_QUESTIONS.map((question) => (
            <option key={question} value={question}>{question}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Answer 2</label>
        <input
          type="text"
          className="form-input"
          value={data.securityAnswer2}
          onChange={(e) => onChange('securityAnswer2', e.target.value)}
          placeholder="Enter your answer"
          required
        />
      </div>
    </>
  );

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={logo} alt="Jinja College" />
          </div>
          <h1 className="login-title">Jinja College</h1>
          <p className="login-subtitle">Class Monitoring System</p>
        </div>
        
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            whiteSpace: 'pre-line',
            lineHeight: '1.6'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            whiteSpace: 'pre-line',
            lineHeight: '1.6',
            fontWeight: '500'
          }}>
            {success}
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-gray)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: failedLoginAttempts >= 3 ? '#eff6ff' : '#f8fafc',
                border: failedLoginAttempts >= 3 ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '12px', color: failedLoginAttempts >= 3 ? '#1d4ed8' : 'var(--text-gray)', marginBottom: '6px', fontWeight: '600' }}>
                {failedLoginAttempts >= 3 ? 'Having trouble signing in?' : 'Forgot your password?'}
              </div>
              <span
                onClick={onNavigateToForgotPassword}
                style={{
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: failedLoginAttempts >= 3 ? '700' : '600',
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                Forgot password?
              </span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
              This is a secure admin-only system. Unauthorized access is prohibited.
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-gray)' }}>
              New teacher?{' '}
              <span onClick={() => changeView('signup')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                Create account
              </span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-gray)', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              New school?{' '}
              <span onClick={onNavigateToSchoolSignup} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                Register your school
              </span>
            </div>
          </form>
        ) : view === 'signup' ? (
          <form onSubmit={handleSignup}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>Create Teacher Account</h3>
            
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={signupData.name}
                onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                placeholder="John Mukasa"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                value={signupData.phone}
                onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                placeholder="+256701234567"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Staff ID</label>
              <input
                type="text"
                className="form-input"
                value={signupData.staff_id}
                onChange={(e) => setSignupData({...signupData, staff_id: e.target.value})}
                placeholder="TCH045"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subjects Taught</label>
              <input
                type="text"
                className="form-input"
                value={signupData.subjects}
                onChange={(e) => setSignupData({...signupData, subjects: e.target.value})}
                placeholder="Mathematics, Physics"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={signupData.password}
                onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                value={signupData.confirmPassword}
                onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                placeholder="Re-enter password"
                required
              />
            </div>

            {securityQuestionsEnabled &&
              renderSecurityQuestionFields(signupData, (field, value) => setSignupData({ ...signupData, [field]: value }))}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              <UserPlus size={18} />
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-gray)' }}>
              Already have an account?{' '}
              <span onClick={() => changeView('login')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                Sign in
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={recoveryUser ? handleRecoveryLogin : handleRecoveryLookup}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>Recover Account</h3>

            {!securityQuestionsEnabled && (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#fef3c7', color: '#92400e', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                {getSecurityQuestionSchemaMessage()}
              </div>
            )}

            {!recoveryUser ? (
              <>
                <div className="form-group">
                  <label className="form-label">Staff ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={recoveryData.staff_id}
                    onChange={(e) => setRecoveryData({ ...recoveryData, staff_id: e.target.value })}
                    placeholder="Enter your staff ID"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  <LogIn size={18} />
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </>
            ) : (
              <>
                <div style={{ padding: '12px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
                  Answer both questions exactly as you saved them when your account was created.
                </div>

                <div className="form-group">
                  <label className="form-label">{recoveryUser.security_question_1}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={recoveryData.answer1}
                    onChange={(e) => setRecoveryData({ ...recoveryData, answer1: e.target.value })}
                    placeholder="Your answer"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{recoveryUser.security_question_2}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={recoveryData.answer2}
                    onChange={(e) => setRecoveryData({ ...recoveryData, answer2: e.target.value })}
                    placeholder="Your answer"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <LogIn size={18} />
                  Sign In With Recovery Questions
                </button>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-gray)' }}>
              Remembered your password?{' '}
              <span onClick={() => changeView('login')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>
                Back to sign in
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
