import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const styles: Record<AlertType, { container: string; iconColor: string; icon: React.ReactNode }> = {
    info: {
      container: 'bg-sky-50 border-sky-200 text-sky-900',
      iconColor: 'text-sky-600',
      icon: <Info className="w-5 h-5" />,
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      iconColor: 'text-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      iconColor: 'text-amber-600',
      icon: <TriangleAlert className="w-5 h-5" />,
    },
    error: {
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      iconColor: 'text-rose-600',
      icon: <AlertCircle className="w-5 h-5" />,
    },
  };

  const current = styles[type];

  return (
    <div
      role="alert"
      className={`rounded-lg border p-3.5 flex items-start gap-3 text-sm ${current.container} ${className}`}
    >
      <div className={`shrink-0 mt-0.5 ${current.iconColor}`}>{current.icon}</div>
      <div className="flex-1">
        {title && <h4 className="font-semibold text-sm mb-0.5 leading-snug">{title}</h4>}
        <div className="leading-relaxed opacity-95">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-slate-400 hover:text-slate-600 rounded p-1 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
