import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  ShieldCheck, 
  Clock, 
  Users, 
  FileCheck2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Unified Campus Maintenance Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Hostel Complaint Tracker
        </h1>

        <p className="text-lg text-slate-600 leading-relaxed">
          Complaints are currently scattered across WhatsApp groups, calls, and paper registers—leaving students in the dark and maintenance requests lost. 
          Our system establishes a <strong className="text-slate-800 font-semibold">single, auditable lifecycle</strong> with backend-enforced role boundaries and server-side SLA escalation.
        </p>

        {/* Action Gateways */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 text-left max-w-2xl mx-auto">
          {/* Student Access Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-900">Student Portal</h3>
                <Badge variant="primary" size="sm">Students</Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Submit complaints, track live milestone timelines, view public hostel feed, and submit reopen requests if an issue recurs.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Link to="/login/student" className="block">
                <Button variant="primary" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Student Login
                </Button>
              </Link>
              <div className="text-center">
                <span className="text-xs text-slate-500">
                  New resident? <Link to="/login/student?mode=register" className="text-indigo-600 font-semibold hover:underline">Register with College Email</Link>
                </span>
              </div>
            </div>
          </div>

          {/* Staff Access Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-400 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-900">Staff Operations</h3>
                <Badge variant="default" size="sm">Authorized Only</Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Role-scoped operations for Caretakers, Technicians, Wardens, and Hostel Admins. Roles are resolved strictly on the backend.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Link to="/login/staff" className="block">
                <Button variant="secondary" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Staff Login
                </Button>
              </Link>
              <p className="text-[11px] text-center text-slate-400">
                Staff accounts are provisioned exclusively by Hostel Admins
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Engineered for Academic Accountability</h2>
          <p className="text-sm text-slate-500 mt-1">Core system invariants enforced strictly on the server</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Verifiable Lifecycle</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strict state machine from <code className="bg-slate-200/60 px-1 py-0.5 rounded">Submitted</code> through <code className="bg-slate-200/60 px-1 py-0.5 rounded">Resolved</code>. Every transition logs an immutable audit entry with actor identity.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Dual SLA Escalation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Background cron monitors Acknowledgment and Resolution deadlines. Tier 1 escalates to Warden; Tier 2 escalates to Hostel Admin.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Authentic Security</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              No self-selected roles or client-side trust. httpOnly cookie sessions, bounded OTP attempts, and public references that are never access tokens.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Demo Credentials helper */}
      <section className="bg-slate-100/80 border border-slate-200 rounded-2xl p-6 text-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Phase 1 Mock Evaluation Credentials</h3>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          For fast verification of both login forms and role-scoped navigation, use these mock credentials or click the auto-fill buttons inside each login page:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800 font-sans mb-1 flex items-center justify-between">
              <span>Student</span>
              <Badge variant="primary" size="sm">Student</Badge>
            </div>
            <p className="text-slate-500">Email: alex.sharma@college.edu</p>
            <p className="text-slate-500">Pass: mock-student-pass</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800 font-sans mb-1 flex items-center justify-between">
              <span>Caretaker</span>
              <Badge variant="warning" size="sm">Staff</Badge>
            </div>
            <p className="text-slate-500">Email: caretaker.mandakini@hostel.edu</p>
            <p className="text-slate-500">Pass: mock-staff-pass</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800 font-sans mb-1 flex items-center justify-between">
              <span>Technician</span>
              <Badge variant="info" size="sm">Staff</Badge>
            </div>
            <p className="text-slate-500">Email: tech.raj@hostel.edu</p>
            <p className="text-slate-500">Pass: mock-staff-pass</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800 font-sans mb-1 flex items-center justify-between">
              <span>Warden</span>
              <Badge variant="purple" size="sm">Staff</Badge>
            </div>
            <p className="text-slate-500">Email: warden.mandakini@hostel.edu</p>
            <p className="text-slate-500">Pass: mock-staff-pass</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800 font-sans mb-1 flex items-center justify-between">
              <span>Hostel Admin</span>
              <Badge variant="danger" size="sm">Admin</Badge>
            </div>
            <p className="text-slate-500">Email: admin@campus.edu</p>
            <p className="text-slate-500">Pass: mock-admin-pass</p>
          </div>
        </div>
      </section>
    </div>
  );
};
