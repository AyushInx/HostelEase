import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname.startsWith('/login');
  const isLanding = location.pathname === '/';

  return (
    <div
      className={`min-h-screen flex flex-col text-slate-800 relative ${
        isLanding || isLoginPage
          ? 'bg-gradient-to-b from-[#fbf8ff] via-[#f7f2fe] to-[#ffffff] overflow-x-hidden'
          : 'bg-slate-50'
      }`}
    >
      {/* Pure CSS Purple Abstract Ambient Design for Landing & Login Pages */}
      {(isLanding || isLoginPage) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
          {/* Subtle micro-grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#d8b4fe_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

          {/* Top ambient purple / violet glow */}
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-purple-200/40 via-violet-100/30 to-transparent blur-3xl rounded-full" />

          {/* Bottom-right soft purple accent */}
          <div className="absolute -bottom-28 -right-28 w-[560px] h-[560px] bg-gradient-to-tl from-purple-200/30 via-violet-100/20 to-transparent blur-3xl rounded-full" />

          {/* Bottom-left soft lavender / indigo accent */}
          <div className="absolute -bottom-28 -left-28 w-[480px] h-[480px] bg-gradient-to-tr from-indigo-200/25 via-purple-100/20 to-transparent blur-3xl rounded-full" />

          {/* Flowing abstract organic wave shape */}
          <svg
            className="absolute top-0 left-0 w-full h-[600px] text-purple-300/20 pointer-events-none"
            viewBox="0 0 1440 600"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 120 C 320 280, 720 0, 1100 180 C 1280 260, 1380 220, 1440 190 L 1440 0 L 0 0 Z"
              fill="url(#topWaveGradient)"
              opacity="0.45"
            />
            <path
              d="M0 160 C 380 320, 800 40, 1160 220 C 1320 300, 1400 260, 1440 230"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            <defs>
              <linearGradient id="topWaveGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fae8ff" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Modern concentric accent arcs in corners */}
          <svg
            className="absolute -top-12 -right-12 w-80 h-80 text-purple-300/25 pointer-events-none hidden md:block"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="200" cy="0" r="140" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="200" cy="0" r="180" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="200" cy="0" r="220" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg
            className="absolute -bottom-12 -left-12 w-72 h-72 text-purple-300/25 pointer-events-none hidden md:block"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="0" cy="200" r="130" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="0" cy="200" r="170" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      <Header />
      <main
        className={`flex-1 w-full relative z-10 ${
          isLanding || isLoginPage
            ? 'flex items-center justify-center p-4 sm:p-6 md:p-8'
            : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
        }`}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
