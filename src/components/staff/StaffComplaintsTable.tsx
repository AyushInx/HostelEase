import React from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  RotateCcw, 
  Eye, 
  UserCheck
} from 'lucide-react';
import type { 
  Complaint, 
  ComplaintCategory, 
  ComplaintPriority, 
  ComplaintStatus, 
  StaffComplaintFilters 
} from '../../types/complaint';
import type { StaffAccount } from '../../services/mockStaffAdminService';
import { useAuth } from '../../context/AuthContext';
import { getPermissionsForRole } from '../../auth/permissions';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface StaffComplaintsTableProps {
  complaints: Complaint[];
  isLoading: boolean;
  filters: StaffComplaintFilters;
  onFilterChange: (newFilters: StaffComplaintFilters) => void;
  technicians: StaffAccount[];
  hostels: { id: string; name: string }[];
  onAcknowledge: (complaint: Complaint) => void;
  onOpenAssign: (complaint: Complaint) => void;
  onStartWork: (complaint: Complaint) => void;
  onOpenComplete: (complaint: Complaint) => void;
  onOpenConfirm: (complaint: Complaint) => void;
  onOpenReject: (complaint: Complaint) => void;
  onOpenApproveReopen: (complaint: Complaint) => void;
  onReprioritize: (complaint: Complaint, newPriority: ComplaintPriority) => void;
  onViewDetails: (complaint: Complaint) => void;
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
  'Seen',
  'Assigned',
  'In Progress',
  'Work Completed',
  'Resolved',
  'Rejected',
  'Reopened',
];

const PRIORITIES: (ComplaintPriority | 'All')[] = ['All', 'Low', 'Medium', 'High', 'Urgent'];

export const StaffComplaintsTable: React.FC<StaffComplaintsTableProps> = ({
  complaints,
  isLoading,
  filters,
  onFilterChange,
  technicians,
  hostels,
  onAcknowledge,
  onOpenAssign,
  onStartWork,
  onOpenComplete,
  onOpenConfirm,
  onOpenReject,
  onOpenApproveReopen,
  onReprioritize,
  onViewDetails,
}) => {
  const { user } = useAuth();
  // CENTRALIZED PERMISSION MATRIX:
  const permissions = getPermissionsForRole(user?.role);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'Reopened': return 'danger';
      case 'In Progress': return 'primary';
      case 'Work Completed': return 'info';
      case 'Rejected': return 'danger';
      case 'Seen': return 'primary';
      case 'Assigned': return 'purple';
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
    <div className="space-y-4">
      {/* Search and Multi-filter Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search */}
          <div className="lg:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by ticket ID, title, student, room..."
              aria-label="Search complaints"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Status"
              value={filters.status || 'All'}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value as ComplaintStatus | 'All' })}
              className="w-full py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-indigo-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Category"
              value={filters.category || 'All'}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value as ComplaintCategory | 'All' })}
              className="w-full py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Priority"
              value={filters.priority || 'All'}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value as ComplaintPriority | 'All' })}
              className="w-full py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-indigo-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p === 'All' ? 'All Priorities' : `${p} Priority`}</option>
              ))}
            </select>
          </div>

          {/* Technician Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Technician"
              value={filters.technicianName || 'All'}
              onChange={(e) => onFilterChange({ ...filters, technicianName: e.target.value })}
              className="w-full py-2 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-indigo-500"
            >
              <option value="All">All Technicians</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cross-hostel filter if Admin */}
        {permissions.canViewAllHostels && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Hostel Scope:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, hostelName: 'All' })}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  !filters.hostelName || filters.hostelName === 'All'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Hostels
              </button>
              {hostels.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, hostelName: h.name })}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filters.hostelName === h.name
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Ticket Ref</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4 text-right">Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading operational complaints...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No complaints match the current scope and filter parameters.
                  </td>
                </tr>
              ) : (
                complaints.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Ticket Ref */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.referenceId}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{item.hostelName}</div>
                      <div className="text-[11px] text-slate-400">{item.block}, {item.roomNumber}</div>
                    </td>

                    {/* Summary */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.description}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {item.category}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {permissions.canReprioritize ? (
                        <select
                          value={item.priority}
                          onChange={(e) => onReprioritize(item, e.target.value as ComplaintPriority)}
                          className="text-[11px] font-semibold py-1 px-1.5 rounded border border-slate-200 bg-white"
                          aria-label={`Change priority for ${item.referenceId}`}
                        >
                          {PRIORITIES.filter((p) => p !== 'All').map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={getPriorityBadgeVariant(item.priority)} size="sm">
                          {item.priority}
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
                        {item.status}
                      </Badge>
                      {item.reopenRequest && item.reopenRequest.status === 'pending_approval' && (
                        <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                          Reopen Pending
                        </div>
                      )}
                    </td>

                    {/* Assigned Tech */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {item.assignedTechnicianName ? (
                        <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.assignedTechnicianName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Role-Specific Actions (Enforced via Centralized Permissions) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* 1. Caretaker: Acknowledge (Submitted -> Seen) */}
                        {permissions.canAcknowledge && item.status === 'Submitted' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onAcknowledge(item)}
                            leftIcon={<UserCheck className="w-3 h-3" />}
                          >
                            Acknowledge
                          </Button>
                        )}

                        {/* 2. Caretaker: Assign Technician */}
                        {permissions.canAssignTechnician && item.status !== 'Resolved' && item.status !== 'Rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenAssign(item)}
                            leftIcon={<Wrench className="w-3 h-3 text-indigo-600" />}
                          >
                            {item.assignedTechnicianName ? 'Reassign' : 'Assign'}
                          </Button>
                        )}

                        {/* 3. Technician: Start Work (Assigned -> In Progress) */}
                        {permissions.canStartWork && item.status === 'Assigned' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onStartWork(item)}
                            leftIcon={<Clock className="w-3 h-3" />}
                          >
                            Start Work
                          </Button>
                        )}

                        {/* 4. Technician: Mark Work Completed (In Progress -> Work Completed) */}
                        {permissions.canMarkWorkCompleted && item.status === 'In Progress' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenComplete(item)}
                            leftIcon={<CheckCircle2 className="w-3 h-3" />}
                          >
                            Complete Work
                          </Button>
                        )}

                        {/* 5. Warden: Confirm Resolution (Work Completed -> Resolved) */}
                        {permissions.canConfirmResolution && item.status === 'Work Completed' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onOpenConfirm(item)}
                            leftIcon={<CheckCircle2 className="w-3 h-3" />}
                          >
                            Confirm Resolution
                          </Button>
                        )}

                        {/* 6. Caretaker or Warden: Approve Reopen (if pending reopen request) */}
                        {permissions.canApproveReopen && item.reopenRequest?.status === 'pending_approval' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onOpenApproveReopen(item)}
                            leftIcon={<RotateCcw className="w-3 h-3" />}
                          >
                            Approve Reopen
                          </Button>
                        )}

                        {/* 7. Caretaker or Warden: Reject Complaint (Requires mandatory reason) */}
                        {permissions.canReject && item.status !== 'Resolved' && item.status !== 'Rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenReject(item)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            Reject
                          </Button>
                        )}

                        {/* Details View */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(item)}
                          leftIcon={<Eye className="w-3 h-3 text-slate-500" />}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
