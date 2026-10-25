import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 text-slate-900 hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                Hostel Complaint Tracker
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                Prototype
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Campus Maintenance & SLA Audit</p>
          </div>
        </Link>

        {/* User state / Quick Nav */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {user.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={user.role === 'Student' ? 'primary' : 'purple'} size="sm">
                    {user.role}
                  </Badge>
                  {user.hostelName && (
                    <span className="text-[11px] text-slate-500">{user.hostelName}</span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login/student">
                <Button variant="ghost" size="sm">
                  Student Login
                </Button>
              </Link>
              <Link to="/login/staff">
                <Button variant="outline" size="sm" leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}>
                  Staff Portal
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
