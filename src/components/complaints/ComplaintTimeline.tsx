import React from 'react';
import { CheckCircle2, Clock, RotateCcw, AlertTriangle, ArrowRight, User } from 'lucide-react';
import type { StatusHistoryEntry, ComplaintStatus } from '../../types/complaint';
import { Badge } from '../common/Badge';

interface ComplaintTimelineProps {
  history: StatusHistoryEntry[];
}

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-slate-400">
        No lifecycle events recorded yet.
      </div>
    );
  }

  const getStatusIcon = (status: ComplaintStatus) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Reopened':
        return <RotateCcw className="w-4 h-4 text-rose-600" />;
      case 'Rejected':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getStatusDotColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-100 border-emerald-500';
      case 'Reopened':
        return 'bg-rose-100 border-rose-500';
      case 'Rejected':
        return 'bg-amber-100 border-amber-500';
      case 'In Progress':
      case 'Work Completed':
        return 'bg-indigo-100 border-indigo-500';
      default:
        return 'bg-blue-100 border-blue-500';
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((entry, idx) => {
          const isLast = idx === history.length - 1;

          return (
            <li key={entry.id || idx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${getStatusDotColor(
                      entry.toStatus
                    )}`}
                  >
                    {getStatusIcon(entry.toStatus)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.fromStatus ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <span className="text-slate-500">{entry.fromStatus}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <Badge variant="primary" size="sm">
                              {entry.toStatus}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="primary" size="sm">
                            {entry.toStatus}
                          </Badge>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-800">{entry.actorName}</span>
                        <span className="text-slate-400">({entry.actorRole})</span>
                      </p>
                    </div>
                    {entry.remarks && (
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 leading-relaxed">
                        {entry.remarks}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
