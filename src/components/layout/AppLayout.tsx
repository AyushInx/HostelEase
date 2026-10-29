import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAuthOrLanding = location.pathname === '/' || location.pathname.startsWith('/login');

  return (
    <div
      className={`min-h-screen flex flex-col text-slate-800 ${
        isAuthOrLanding
          ? 'bg-[url("/campus-bg.jpg")] bg-cover bg-center bg-fixed bg-no-repeat relative'
          : 'bg-slate-50'
      }`}
    >
      {isAuthOrLanding && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-purple-50/25 to-white/50 pointer-events-none" />
      )}
      <Header />
      <main
        className={`flex-1 w-full relative z-10 ${
          isAuthOrLanding
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
