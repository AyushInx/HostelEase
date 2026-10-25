import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Mail, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

export const StudentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRegisterMode = searchParams.get('mode') === 'register';

  const { loginStudent } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterNotice, setShowRegisterNotice] = useState(isRegisterMode);

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'College email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        nextErrors.email = 'Please enter a valid email address';
      } else if (!email.trim().toLowerCase().endsWith('.edu')) {
        nextErrors.email = 'Please enter your institutional email (must end in .edu)';
      }
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginStudent({ email, password });
      if (!result.success) {
        setApiError(result.message || 'Login failed. Please verify credentials.');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setApiError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('alex.sharma@college.edu');
    setPassword('mock-student-pass');
    setErrors({});
    setApiError(null);
  };

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Back to landing */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Overview
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Student Portal Login</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in with your institutional credentials to submit and track complaints.
          </p>
        </div>

        {/* Register Modal/Notice */}
        {showRegisterNotice && (
          <div className="mb-6">
            <Alert
              type="info"
              title="Student Registration (Scheduled for Phase 3)"
              onDismiss={() => setShowRegisterNotice(false)}
            >
              <p className="text-xs text-sky-800 leading-relaxed mb-2">
                Self-service student registration with OTP email verification and eligibility status checks is being implemented in Phase 3.
              </p>
              <p className="text-xs text-sky-900 font-semibold">
                Use the mock demo credentials below to test the authenticated student view.
              </p>
            </Alert>
          </div>
        )}

        {/* Global Error Notice */}
        {apiError && (
          <div className="mb-5">
            <Alert type="error" title="Authentication Error" onDismiss={() => setApiError(null)}>
              {apiError}
            </Alert>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="student-email"
            label="College Email Address"
            type="email"
            required
            placeholder="e.g. yourname@college.edu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            helperText="Must be an institutional email address"
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <Input
            id="student-password"
            label="Password"
            type="password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            leftIcon={<Lock className="w-4 h-4" />}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            className="mt-2"
          >
            Sign In as Student
          </Button>
        </form>

        {/* Demo Auto-fill Helper */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFillDemo}
            leftIcon={<UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            Auto-fill Demo Student Credentials
          </Button>
        </div>

        {/* Registration Link */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Don't have a verified account yet?{' '}
            <button
              type="button"
              onClick={() => setShowRegisterNotice(true)}
              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Register here
            </button>
          </p>
        </div>
      </div>

      {/* Security footnote */}
      <div className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>Protected by server-enforced institutional scoping and rate limiting.</span>
      </div>
    </div>
  );
};
