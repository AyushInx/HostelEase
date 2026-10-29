import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-slate-500 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
        <p>© 2026 Indian Institute of Technology Patna. HostelEase. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-600 font-medium">IIT Patna Campus Maintenance Portal</span>
        </div>
      </div>
    </footer>
  );
};
