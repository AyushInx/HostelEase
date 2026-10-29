import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Mail, Lock, ShieldCheck, UserCheck, User, Building, KeyRound } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../context/AuthContext';

export const StudentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRegisterMode = searchParams.get('mode') === 'register';

  const { loginStudent, sendStudentOtp, registerStudent } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(initialRegisterMode);

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regHostel, setRegHostel] = useState('Kalam Hostel');
  const [regRoom, setRegRoom] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [regErrors, setRegErrors] = useState<{
    name?: string;
    email?: string;
    room?: string;
    password?: string;
    otp?: string;
  }>({});

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const validateSignIn = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'College email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        nextErrors.email = 'Please enter a valid email address';
      } else if (!email.trim().toLowerCase().endsWith('@iitp.ac.in')) {
        nextErrors.email = 'Please enter your institutional email (must end with @iitp.ac.in)';
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateSignIn()) {
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
    setEmail('alex.sharma@iitp.ac.in');
    setPassword('mock-student-pass');
    setErrors({});
    setApiError(null);
  };

  const handleFillDemoPriya = () => {
    setEmail('priya.patel@iitp.ac.in');
    setPassword('mock-student-pass');
    setErrors({});
    setApiError(null);
  };

  const handleSendOtp = async () => {
    setApiError(null);
    setSuccessMessage(null);
    const nextErrors: { email?: string } = {};
    if (!regEmail.trim()) {
      nextErrors.email = 'College email is required';
    } else if (!regEmail.trim().toLowerCase().endsWith('@iitp.ac.in')) {
      nextErrors.email = 'Email must end with @iitp.ac.in';
    }

    if (Object.keys(nextErrors).length > 0) {
      setRegErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    setIsLoading(true);
    try {
      if (sendStudentOtp) {
        const res = await sendStudentOtp(regEmail);
        if (res.success) {
          setOtpSent(true);
          setCooldownSeconds(60);
          setRegOtp('');
          setSuccessMessage(res.message || 'Verification code sent to your @iitp.ac.in inbox.');
        } else {
          setApiError(res.message || 'Failed to dispatch verification code.');
        }
      } else {
        setOtpSent(true);
        setCooldownSeconds(60);
        setRegOtp('');
        setSuccessMessage('Verification code dispatched to your institutional inbox.');
      }
    } catch {
      setApiError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const nextErrors: {
      name?: string;
      email?: string;
      room?: string;
      password?: string;
      otp?: string;
    } = {};

    if (!regName.trim()) nextErrors.name = 'Full name is required';
    if (!regEmail.trim()) {
      nextErrors.email = 'College email is required';
    } else if (!regEmail.trim().toLowerCase().endsWith('@iitp.ac.in')) {
      nextErrors.email = 'Email must end with @iitp.ac.in';
    }
    if (!regRoom.trim()) nextErrors.room = 'Room number is required';
    if (!regPassword) {
      nextErrors.password = 'Password is required';
    } else if (regPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    if (!otpSent) {
      nextErrors.otp = 'Please send and verify OTP first';
    } else if (!regOtp.trim()) {
      nextErrors.otp = 'Verification OTP is required';
    }

    setRegErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      if (registerStudent) {
        const res = await registerStudent({
          name: regName,
          email: regEmail,
          password: regPassword,
          hostelName: regHostel,
          roomNumber: regRoom,
          otp: regOtp,
        });

        if (res.success) {
          navigate('/dashboard');
        } else {
          setApiError(res.message || 'Registration failed.');
        }
      }
    } catch {
      setApiError('An unexpected network error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
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
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isRegisterMode ? 'Student Registration' : 'Student Portal Login'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {isRegisterMode
              ? 'Register with your institutional @iitp.ac.in email and verify via OTP.'
              : 'Sign in with your institutional credentials to submit and track complaints.'}
          </p>
        </div>

        {/* Global Error Notice */}
        {apiError && (
          <div className="mb-5">
            <Alert type="error" title="Authentication Error" onDismiss={() => setApiError(null)}>
              {apiError.toLowerCase().includes('domain') || apiError.toLowerCase().includes('resend') || apiError.includes('only send testing emails')
                ? 'Authentication error (domain).'
                : apiError}
            </Alert>
          </div>
        )}

        {!isRegisterMode ? (
          /* ================= SIGN IN VIEW ================= */
          <>
            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              <Input
                id="student-email"
                label="College Email Address"
                type="email"
                required
                placeholder="e.g. yourname@iitp.ac.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                helperText="Must be an institutional email address ending with @iitp.ac.in"
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
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Quick Demo Student Credentials:</span>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFillDemo}
                  leftIcon={<UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                  className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  Auto-fill Demo Student Credentials (Alex)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFillDemoPriya}
                  leftIcon={<UserCheck className="w-3.5 h-3.5 text-pink-600" />}
                  className="text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                >
                  Priya (Asima Hostel ♀)
                </Button>
              </div>
            </div>

            {/* Switch to Registration */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                Don't have a verified account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setApiError(null);
                    setErrors({});
                  }}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </p>
            </div>
          </>
        ) : (
          /* ================= REGISTRATION VIEW ================= */
          <>
            {successMessage && (
              <div className="mb-4">
                <Alert
                  type="success"
                  title="Verification Code Sent"
                  onDismiss={() => setSuccessMessage(null)}
                >
                  <p className="text-xs text-emerald-800">
                    {successMessage}
                  </p>
                </Alert>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <Input
                id="reg-name"
                label="Full Name"
                type="text"
                required
                placeholder="e.g. Ayush"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  if (regErrors.name) setRegErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={regErrors.name}
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                id="reg-email"
                label="College Email Address"
                type="email"
                required
                placeholder="e.g. ayush_2401ec60@iitp.ac.in"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  if (regErrors.email) setRegErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={regErrors.email}
                helperText="Must be an institutional email address ending with @iitp.ac.in"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Hostel
                  </label>
                  <select
                    value={regHostel}
                    onChange={(e) => setRegHostel(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="Kalam Hostel">Kalam Hostel</option>
                    <option value="Asima Hostel">Asima Hostel (Girls' Hostel)</option>
                    <option value="Aryabhatta Hostel">Aryabhatta Hostel</option>
                    <option value="C.V.R Hostel">C.V.R Hostel</option>
                  </select>
                </div>

                <Input
                  id="reg-room"
                  label="Room Number"
                  type="text"
                  required
                  placeholder="e.g. A-201"
                  value={regRoom}
                  onChange={(e) => {
                    setRegRoom(e.target.value);
                    if (regErrors.room) setRegErrors((prev) => ({ ...prev, room: undefined }));
                  }}
                  error={regErrors.room}
                />
              </div>

              <Input
                id="reg-password"
                label="Choose Password"
                type="password"
                required
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => {
                  setRegPassword(e.target.value);
                  if (regErrors.password) setRegErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={regErrors.password}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              {/* OTP section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    Email OTP Verification
                  </span>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading || cooldownSeconds > 0}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {cooldownSeconds > 0
                      ? `Resend in ${cooldownSeconds}s`
                      : otpSent
                      ? 'Resend Code'
                      : 'Send Code'}
                  </button>
                </div>

                {otpSent && (
                  <Input
                    id="reg-otp"
                    label="6-Digit Verification Code"
                    type="text"
                    required
                    placeholder="e.g. 583921"
                    value={regOtp}
                    maxLength={6}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setRegOtp(val);
                      if (regErrors.otp) setRegErrors((prev) => ({ ...prev, otp: undefined }));
                    }}
                    error={regErrors.otp}
                    helperText="Enter the 6-digit code sent to your institutional email."
                  />
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="mt-2"
              >
                {otpSent ? 'Verify & Create Account' : 'Send OTP & Register'}
              </Button>
            </form>

            {/* Switch to Sign In */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setApiError(null);
                    setRegErrors({});
                  }}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Security footnote */}
      <div className="mt-4 text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5 bg-white/70 backdrop-blur-xs py-1.5 px-3 rounded-full border border-white/80 max-w-sm mx-auto shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
        <span>Protected by server-enforced institutional scoping and rate limiting.</span>
      </div>
    </div>
  );
};
