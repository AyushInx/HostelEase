import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  ShieldCheck, 
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
          <span>SMART CAMPUS MAINTENANCE</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Every issue deserves a resolution.
        </h1>

        <p className="text-lg text-slate-600 leading-relaxed">
          Report complaints, track progress, and hold every maintenance request accountable — all in one place.
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
    </div>
  );
};
