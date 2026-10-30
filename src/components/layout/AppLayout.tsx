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
        isLanding
          ? 'bg-[url("/campus-bg.jpg")] bg-cover bg-center bg-fixed bg-no-repeat'
          : isLoginPage
          ? 'bg-[#f8fafc] overflow-hidden'
          : 'bg-slate-50'
      }`}
    >
      {/* Landing Visual Overlay */}
      {isLanding && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-purple-50/25 to-white/50 pointer-events-none" />
      )}

      {/* Pure CSS Cool Ambient Design for Login Pages (No raster images) */}
      {isLoginPage && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
          {/* Subtle micro-grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

          {/* Top ambient indigo / violet glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[760px] h-[450px] bg-gradient-to-b from-indigo-200/40 via-purple-100/30 to-transparent blur-3xl rounded-full" />

          {/* Bottom-right soft purple accent */}
          <div className="absolute -bottom-24 -right-24 w-[480px] h-[480px] bg-gradient-to-tl from-purple-200/30 via-indigo-100/20 to-transparent blur-3xl rounded-full" />

          {/* Bottom-left soft sky accent */}
          <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-gradient-to-tr from-sky-200/30 via-indigo-100/20 to-transparent blur-3xl rounded-full" />

          {/* Modern concentric accent arcs in corners */}
          <svg
            className="absolute -top-12 -right-12 w-80 h-80 text-indigo-300/20 pointer-events-none hidden md:block"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="200" cy="0" r="140" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="200" cy="0" r="180" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="200" cy="0" r="220" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg
            className="absolute -bottom-12 -left-12 w-72 h-72 text-purple-300/20 pointer-events-none hidden md:block"
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
