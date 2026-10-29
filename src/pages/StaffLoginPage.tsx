import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

export const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginStaff } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Staff email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        nextErrors.email = 'Please enter a valid email address';
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
      const result = await loginStaff({ email, password });
      if (!result.success) {
        setApiError(result.message || 'Staff authentication failed. Account not found or bad credentials.');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setApiError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setApiError(null);
  };

  return (
    <div className="max-w-md w-full mx-auto py-4">
      {/* Back to landing */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/80 backdrop-blur-md border border-white/80 rounded-full px-3.5 py-1.5 shadow-2xs transition-all mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Overview
      </Link>

      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/80 p-8 shadow-2xl shadow-purple-900/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-slate-900/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff & Operations Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Access maintenance assignments, acknowledgments, resolutions, and audit logs.
          </p>
        </div>

        {/* Security Policy Notice: No Role Picker, No Public Signup */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Strict Role Invariants Enforced</span>
          </div>
          <p className="leading-relaxed">
            Staff roles (Caretaker, Technician, Warden, Hostel Admin) are <strong>resolved server-side</strong> upon authentication. 
            There is <em>no client-side role picker</em>, and staff accounts cannot self-register.
          </p>
        </div>

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
            id="staff-email"
            label="Staff Institutional Email"
            type="email"
            required
            placeholder="e.g. staff.name@iitp.ac.in"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            helperText="Official staff email assigned by administration (must end with @iitp.ac.in)"
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <Input
            id="staff-password"
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
            variant="secondary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            className="mt-2"
          >
            Authenticate Staff
          </Button>
        </form>

        {/* Quick Demo Staff Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">Quick Test Staff Profiles:</span>
            <span className="text-[10px] text-slate-400">Click to fill</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('caretaker.kalam@iitp.ac.in', 'mock-staff-pass')}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-slate-800">Caretaker</div>
              <div className="text-[10px] text-slate-400 truncate">caretaker.kalam...</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('caretaker.asima@iitp.ac.in', 'mock-staff-pass')}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-slate-800">Staff (Asima ♀)</div>
              <div className="text-[10px] text-slate-400 truncate">asima.staff...</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('tech.raj@iitp.ac.in', 'mock-staff-pass')}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-slate-800">Technician</div>
              <div className="text-[10px] text-slate-400 truncate">tech.raj@iitp.ac.in</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('warden.kalam@iitp.ac.in', 'mock-staff-pass')}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-slate-800">Warden</div>
              <div className="text-[10px] text-slate-400 truncate">warden.kalam...</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('warden.asima@iitp.ac.in', 'mock-staff-pass')}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-slate-800">Warden (Asima ♀)</div>
              <div className="text-[10px] text-slate-400 truncate">warden.asima...</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('admin@iitp.ac.in', 'mock-admin-pass')}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-slate-800">Hostel Admin</div>
              <div className="text-[10px] text-slate-400 truncate">admin@iitp.ac.in</div>
            </button>
          </div>
        </div>

        {/* Public Signup Disclaimer */}
        <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Staff accounts cannot be registered publicly. If you are newly appointed staff, contact your campus Hostel Administrator for provisioning.
          </span>
        </div>
      </div>

      {/* Security footnote */}
      <div className="mt-4 text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5 bg-white/70 backdrop-blur-xs py-1.5 px-3 rounded-full border border-white/80 max-w-sm mx-auto shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
        <span>Protected by role-based server middleware and immutable audit logging.</span>
      </div>
    </div>
  );
};
