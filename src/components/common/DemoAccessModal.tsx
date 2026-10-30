import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../../context/AuthContext';

interface DemoAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DemoAccessModal: React.FC<DemoAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { verifyDemoAccess } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsSubmitting(false);
      // Auto-focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setPassword('');
    setError(null);
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setError('Please enter the access password.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      let isVerified = false;
      let errorMsg = 'Incorrect password. Please try again.';

      if (verifyDemoAccess) {
        const res = await verifyDemoAccess(trimmedPassword);
        if (res.success) {
          isVerified = true;
        } else if (res.error) {
          errorMsg = res.error;
        }
      } else {
        // Fallback validation
        isVerified = trimmedPassword === '280723';
      }

      if (isVerified) {
        setPassword('');
        setError(null);
        onSuccess();
        onClose();
      } else {
        setError(errorMsg);
        inputRef.current?.focus();
      }
    } catch {
      setError('Incorrect password. Please try again.');
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200"
    >
      <div className="relative bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-left transition-all transform duration-200">
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 id="demo-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              Demo Access
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Enter the access password to continue.
            </p>
          </div>
        </div>

        {/* Inline Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="demo-access-password"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Access Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                id="demo-access-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter access password"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Unlock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

