import React from 'react';
import { Layers, Send, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import type { ComplaintOverviewStats, ComplaintStatus } from '../../types/complaint';

interface ComplaintStatsCardProps {
  stats: ComplaintOverviewStats;
  selectedStatus?: ComplaintStatus | 'All';
  onSelectStatus?: (status: ComplaintStatus | 'All') => void;
}

export const ComplaintStatsCard: React.FC<ComplaintStatsCardProps> = ({
  stats,
  selectedStatus = 'All',
  onSelectStatus,
}) => {
  const items = [
    {
      key: 'All' as const,
      label: 'Total Tickets',
      count: stats.total,
      icon: Layers,
      color: 'text-slate-700 bg-slate-100 border-slate-200',
      activeRing: 'ring-2 ring-slate-400',
    },
    {
      key: 'Submitted' as const,
      label: 'Submitted',
      count: stats.submitted,
      icon: Send,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      activeRing: 'ring-2 ring-blue-500',
    },
    {
      key: 'In Progress' as const,
      label: 'In Progress',
      count: stats.inProgress,
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      activeRing: 'ring-2 ring-amber-500',
    },
    {
      key: 'Resolved' as const,
      label: 'Resolved',
      count: stats.resolved,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      activeRing: 'ring-2 ring-emerald-500',
    },
    {
      key: 'Reopened' as const,
      label: 'Reopened',
      count: stats.reopened,
      icon: RotateCcw,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      activeRing: 'ring-2 ring-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedStatus === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectStatus?.(item.key)}
            className={`
              p-4 rounded-xl border text-left transition-all bg-white shadow-2xs cursor-pointer
              hover:shadow-sm hover:border-slate-300 focus:outline-none
              ${isSelected ? item.activeRing : 'border-slate-200'}
            `}
            aria-pressed={isSelected}
            aria-label={`Filter by ${item.label}: ${item.count} complaints`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {item.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {item.count}
            </div>
          </button>
        );
      })}
    </div>
  );
};
