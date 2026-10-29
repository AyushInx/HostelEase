import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-6 sm:py-10 relative overflow-hidden">
      {/* Subtle Top-Right Decorative Arcs */}
      <svg
        className="absolute -top-10 -right-10 w-72 h-72 text-purple-300/35 pointer-events-none hidden md:block"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="200" cy="0" r="140" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="200" cy="0" r="180" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="200" cy="0" r="220" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Subtle Top-Left Decorative Arcs */}
      <svg
        className="absolute -top-12 -left-12 w-64 h-64 text-purple-300/25 pointer-events-none hidden md:block"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="0" cy="0" r="130" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="170" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Hero Badge */}
      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-purple-200/80 text-indigo-700 text-xs font-bold tracking-wider shadow-2xs mb-4">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span>SMART CAMPUS CARE</span>
      </div>

      {/* Main Headline */}
      <div className="text-center max-w-3xl mx-auto px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.18] mb-3">
          A better way to fix{' '}
          <span className="relative inline-block text-slate-900">
            campus.
            {/* Playful brush stroke curve */}
            <svg
              className="absolute -bottom-2.5 left-0 w-full overflow-visible pointer-events-none"
              height="14"
              viewBox="0 0 160 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 9.5C42 3.5 122 3 156 9C112 6.5 52 7 12 11.5"
                stroke="#a855f7"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.65"
              />
            </svg>
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 font-medium tracking-wide">
          Report it. Track it. Done.
        </p>
      </div>

      {/* Two Action Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl w-full pt-8 sm:pt-10 px-4 z-10">
        {/* Student Gateway Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 sm:p-8 border border-white/80 shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-left">
          <div>
            <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5 shadow-2xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              For students
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1 mb-6">
              Raise issues. Track updates.
            </p>
          </div>

          <div>
            <Link to="/login/student" className="block w-full">
              <button
                type="button"
                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold py-3.5 px-6 rounded-2xl shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <span>Student login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link
              to="/login/student?mode=register"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mt-4 text-center block"
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Staff Gateway Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 sm:p-8 border border-white/80 shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-left">
          <div>
            <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-5 shadow-2xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              For campus teams
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1 mb-6">
              Review. Assign. Resolve.
            </p>
          </div>

          <div>
            <Link to="/login/staff" className="block w-full">
              <button
                type="button"
                className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold py-3.5 px-6 rounded-2xl shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <span>Staff login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <span className="text-xs font-medium text-slate-400 mt-4 text-center block">
              Authorized access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
