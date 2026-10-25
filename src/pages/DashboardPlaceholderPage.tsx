import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  LogOut, 
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';
import { StudentDashboardPage } from './StudentDashboardPage';

export const DashboardPlaceholderPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Alert type="warning" title="Not Authenticated">
          You are not currently logged in. Please sign in via the Student or Staff portal.
        </Alert>
        <div className="mt-4">
          <Button variant="primary" onClick={() => navigate('/')}>
            Go to Landing Page
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2: If active user is Student, render the full Student Maintenance Hub
  if (user.role === 'Student') {
    return <StudentDashboardPage />;
  }

  // Otherwise, staff session overview
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Caretaker': return 'warning';
      case 'Technician': return 'info';
      case 'Warden': return 'purple';
      case 'Hostel Admin': return 'danger';
      default: return 'default';
    }
  };

  const getEligibilityBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      case 'suspended': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Welcome, {user.name}
            </h1>
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Authenticated Staff Session • {user.email}
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={handleLogout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Sign Out
        </Button>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          <span>Active Session Details (Verified Scope)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Assigned Role</span>
            <div className="mt-1 font-semibold text-slate-800">{user.role}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Account Status</span>
            <div className="mt-1">
              <Badge variant={getEligibilityBadgeVariant(user.eligibilityStatus)}>
                {user.eligibilityStatus}
              </Badge>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Hostel Jurisdiction</span>
            <div className="mt-1 font-semibold text-slate-800">
              {user.hostelName || 'Cross-Hostel Administration'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Assignment Type</span>
            <div className="mt-1 font-semibold text-slate-800">
              {user.role === 'Technician' ? 'Field Work Orders' : 'Oversight & Audit'}
            </div>
          </div>
        </div>
      </div>

      {/* Phase Roadmap Notice for Staff */}
      <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-950 text-base">
              Phase 2 Active: Student Hub & Service Layer Complete
            </h3>
            <p className="text-xs sm:text-sm text-indigo-900/90 leading-relaxed mt-1">
              Phase 2 has implemented the student complaint lifecycle, search, timeline audit history, and hostel community feed behind an explicit <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-medium">IComplaintService</code> interface.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-indigo-200/70 shadow-2xs">
            <span className="font-bold text-slate-800 block mb-1">To Test Full Student Flow:</span>
            <p className="text-slate-600">
              Sign out and sign in using Student Login (or auto-fill <code className="bg-slate-100 px-1 py-0.5 rounded">alex.sharma@college.edu</code>) to test ticket generation, status filters, community support, and timeline auditing.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-indigo-200/70 shadow-2xs">
            <span className="font-bold text-slate-800 block mb-1">Upcoming in Phase 4 & 9:</span>
            <p className="text-slate-600">
              Staff operational views: Caretaker ticket triage & technician assignment, Technician repair note logs, and Warden resolution confirmations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
