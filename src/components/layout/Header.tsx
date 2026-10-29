import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-purple-100/60 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 text-slate-900 hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                HostelEase
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                BETA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Campus Care</p>
          </div>
        </Link>

        {/* User state / Quick Nav */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {user.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200/80">
                    {user.role === 'Hostel Admin' ? 'HOSTEL ADMIN' : user.role.toUpperCase()}
                  </span>
                  {user.hostelName && (
                    <span className="text-[11px] text-slate-500 font-medium">· {user.hostelName}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login/student"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100/70 transition-colors hidden sm:inline-block"
              >
                Student Login
              </Link>
              <Link
                to="/login/staff"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white/80 hover:bg-white shadow-2xs transition-colors inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Staff Portal</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
