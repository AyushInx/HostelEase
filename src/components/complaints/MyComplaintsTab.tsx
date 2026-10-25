import React from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  FileQuestion, 
  Plus
} from 'lucide-react';
import type { Complaint, ComplaintCategory, ComplaintStatus } from '../../types/complaint';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface MyComplaintsTabProps {
  complaints: Complaint[];
  isLoading: boolean;
  onOpenDetail: (complaint: Complaint) => void;
  onOpenCreate: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: ComplaintStatus | 'All';
  onStatusChange: (status: ComplaintStatus | 'All') => void;
  selectedCategory: ComplaintCategory | 'All';
  onCategoryChange: (category: ComplaintCategory | 'All') => void;
}

const CATEGORIES: (ComplaintCategory | 'All')[] = [
  'All',
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Internet/WiFi',
  'Cleanliness',
  'Civil',
  'Mess/Dining',
  'Other',
];

const STATUSES: (ComplaintStatus | 'All')[] = [
  'All',
  'Submitted',
  'In Progress',
  'Resolved',
  'Reopened',
];

export const MyComplaintsTab: React.FC<MyComplaintsTabProps> = ({
  complaints,
  isLoading,
  onOpenDetail,
  onOpenCreate,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
}) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'Reopened': return 'danger';
      case 'In Progress':
      case 'Work Completed':
      case 'Assigned':
      case 'Seen':
        return 'primary';
      case 'Rejected': return 'danger';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'primary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              aria-label="Search complaints by ticket ID, title, or room"
              placeholder="Search by ticket ID (e.g. HCT-2026-84912), title, room..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              aria-label="Filter by Status"
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as ComplaintStatus | 'All')}
              className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              {STATUSES.filter((s) => s !== 'All').map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value as ComplaintCategory | 'All')}
              className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaint List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Complaints Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || selectedStatus !== 'All' || selectedCategory !== 'All'
              ? 'No complaints matched your active search filters. Try resetting the filters.'
              : 'You have not submitted any complaints yet. Need campus maintenance assistance?'}
          </p>
          <Button variant="primary" size="sm" onClick={onOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Submit a New Complaint
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {item.referenceId}
                  </span>
                  <Badge variant={getStatusBadgeVariant(item.status)}>
                    {item.status}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(item.priority)} size="sm">
                    {item.priority}
                  </Badge>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">{item.category}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 truncate">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-1">
                  {item.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.hostelName}, {item.block}, Room {item.roomNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  {item.assignedTechnicianName && (
                    <span className="text-indigo-600 font-medium">
                      Assigned: {item.assignedTechnicianName}
                    </span>
                  )}
                  {item.reopenRequest && (
                    <span className="text-rose-600 font-medium">
                      (Reopen Requested)
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => onOpenDetail(item)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  View Details & Timeline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
