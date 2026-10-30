import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-8 sm:py-14 relative overflow-hidden">
      {/* Decorative Organic Flowing Waves & Curves (Pure Vector / CSS) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0">
        {/* Subtle curved floating ribbons */}
        <svg
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-[1300px] h-[480px] text-purple-300/35"
          viewBox="0 0 1300 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 180 C 250 320, 520 60, 880 220 C 1080 300, 1220 180, 1380 240"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray="6 8"
          />
          <path
            d="M-20 230 C 280 370, 550 110, 910 270 C 1110 350, 1250 230, 1410 290"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.5"
          />
        </svg>

        {/* Minimal geometric floating rings & capsules */}
        <div className="absolute top-12 left-[8%] w-36 h-36 rounded-full border border-purple-200/50 bg-gradient-to-tr from-purple-100/20 to-transparent backdrop-blur-xs -rotate-12 hidden lg:block" />
        <div className="absolute bottom-20 right-[7%] w-52 h-52 rounded-full border border-violet-200/40 bg-gradient-to-bl from-violet-100/20 to-transparent backdrop-blur-xs rotate-45 hidden lg:block" />
        <div className="absolute top-44 right-[12%] w-24 h-12 rounded-full border border-purple-200/60 bg-white/40 rotate-12 hidden md:block" />
        <div className="absolute bottom-36 left-[10%] w-20 h-10 rounded-full border border-indigo-200/60 bg-white/40 -rotate-12 hidden md:block" />
      </div>

      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50/90 border border-purple-200/80 text-purple-900 text-xs font-bold tracking-wider shadow-xs mb-5 z-10 transition-transform hover:scale-105">
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span>SMART CAMPUS CARE</span>
      </div>

      {/* Main Headline */}
      <div className="text-center max-w-3xl mx-auto px-4 z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.16] mb-4">
          A better way to fix{' '}
          <span className="relative inline-block text-purple-950">
            campus.
            {/* Elegant organic purple underline wave */}
            <svg
              className="absolute -bottom-2.5 left-0 w-full overflow-visible pointer-events-none"
              height="14"
              viewBox="0 0 160 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 9.5C42 3.5 122 3 156 9C112 6.5 52 7 12 11.5"
                stroke="#9333ea"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />
            </svg>
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 font-medium tracking-wide max-w-xl mx-auto">
          Report it. Track it. Done.
        </p>

        {/* Value metric pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-purple-100 text-[11px] font-semibold text-purple-900/90 shadow-2xs backdrop-blur-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            Live Status Tracking
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-purple-100 text-[11px] font-semibold text-purple-900/90 shadow-2xs backdrop-blur-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
            Strict SLA Deadlines
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-purple-100 text-[11px] font-semibold text-purple-900/90 shadow-2xs backdrop-blur-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            Immutable Audit Trail
          </span>
        </div>
      </div>

      {/* Two Action Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl w-full pt-8 sm:pt-12 px-4 z-10">
        {/* Student Gateway Card */}
        <div className="group relative bg-white/85 backdrop-blur-xl rounded-3xl p-7 sm:p-9 border border-purple-100/90 shadow-xl shadow-purple-950/5 hover:shadow-2xl hover:shadow-purple-900/10 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-left overflow-hidden">
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-purple-100/50 via-transparent to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-50 border border-purple-200/80 flex items-center justify-center text-purple-700 mb-5 shadow-2xs group-hover:scale-105 transition-transform duration-300">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              For students
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1 mb-8">
              Raise issues. Track updates.
            </p>
          </div>

          <div>
            <Link to="/login/student" className="block w-full">
              <button
                type="button"
                className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-md shadow-purple-600/25 hover:shadow-lg hover:shadow-purple-600/35 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <span>Student login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link
              to="/login/student?mode=register"
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors mt-4 text-center block"
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Staff Gateway Card */}
        <div className="group relative bg-white/85 backdrop-blur-xl rounded-3xl p-7 sm:p-9 border border-purple-100/90 shadow-xl shadow-purple-950/5 hover:shadow-2xl hover:shadow-purple-900/10 hover:border-purple-300 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-left overflow-hidden">
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-slate-100/60 via-transparent to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-purple-50 border border-slate-200 flex items-center justify-center text-slate-800 mb-5 shadow-2xs group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              For campus teams
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1 mb-8">
              Review. Assign. Resolve.
            </p>
          </div>

          <div>
            <Link to="/login/staff" className="block w-full">
              <button
                type="button"
                className="w-full bg-[#0f172a] hover:bg-[#1e1b4b] text-white font-semibold py-3.5 px-6 rounded-2xl shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-purple-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <span>Staff login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
