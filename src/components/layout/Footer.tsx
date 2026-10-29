import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-purple-100/60 bg-white/70 backdrop-blur-md py-4 text-slate-500 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <p className="text-slate-500 font-medium">© 2026 IIT Patna · HostelEase</p>
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Campus Maintenance Portal</span>
        </div>
      </div>
    </footer>
  );
};
