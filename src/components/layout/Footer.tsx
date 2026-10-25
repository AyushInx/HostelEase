import React from 'react';
import { ShieldCheck, Lock, FileText } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-slate-500 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-2">Hostel Complaint Tracker</h4>
            <p className="leading-relaxed text-slate-600">
              An academic web app prototype engineered for auditable campus maintenance workflows, SLA deadline enforcement, and transparent ticket lifecycle tracking.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" />
              Security Architecture
            </h4>
            <ul className="space-y-1.5 text-slate-600">
              <li>• Role checks strictly enforced on backend</li>
              <li>• httpOnly, secure, sameSite session cookies</li>
              <li>• Reference codes are not access tokens</li>
              <li>• Staff provisioned by Hostel Admin only</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Repository Documents
            </h4>
            <ul className="space-y-1.5 text-slate-600">
              <li>• Specifications: <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">/docs/SPEC.md</code></li>
              <li>• Operating Guidelines: <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">/AGENTS.md</code></li>
              <li>• Status: Phase 1 Complete (Scaffolding & Auth Mock)</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
          <p>© 2026 Academic Prototype. Developed in strict verified engineering phases.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-600 font-medium">Verified Phase 1 Scaffolding</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
