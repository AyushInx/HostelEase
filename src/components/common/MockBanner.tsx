import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const MockBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-100/80 border-b border-amber-200 text-amber-900 px-3 py-1.5 text-xs flex items-center justify-center gap-2 font-medium">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>
          <strong>Phase 1 Mock Mode:</strong> Auth is handled via <code className="bg-amber-200/60 px-1 py-0.5 rounded text-[11px]">IAuthService</code> mock provider. No real secrets required.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs sm:text-sm shadow-xs mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-200/70 text-amber-800 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px] bg-amber-200/80 px-2 py-0.5 rounded">
              Mock Data Separation Active
            </span>
            <span className="text-slate-500 text-xs">• Phase 1 Scaffolding</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Authentication is decoupled behind an explicit <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono font-medium">IAuthService</code> interface.
            Real password validation, OTP flows, and HTTP-only cookie sessions will be bound in Phase 3 without changing UI consumer components.
          </p>
        </div>
      </div>
    </div>
  );
};
