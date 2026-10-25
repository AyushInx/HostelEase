import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Wrench, 
  UserCheck, 
  Layers, 
  FileText, 
  Users, 
  RefreshCw,
  LogOut
} from 'lucide-react';
import type { 
  Complaint, 
  ComplaintPriority, 
  StaffComplaintFilters 
} from '../types/complaint';
import type { StaffAccount, HostelRecord } from '../services/mockStaffAdminService';
import { complaintService } from '../services/mockComplaintService';
import { staffAdminService } from '../services/mockStaffAdminService';
import { useAuth } from '../context/AuthContext';
import { StaffComplaintsTable } from '../components/staff/StaffComplaintsTable';
import { 
  AssignTechnicianModal, 
  WorkCompletedModal, 
  ConfirmResolutionModal, 
  RejectComplaintModal, 
  ApproveReopenModal 
} from '../components/staff/StaffActionModals';
import { HostelConfigView, StaffManagementView, AuditLogView } from '../components/staff/AdminViews';
import { ComplaintDetailModal } from '../components/complaints/ComplaintDetailModal';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';

export const StaffDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const [activeAdminTab, setActiveAdminTab] = useState<'complaints' | 'hostels' | 'staff' | 'audit'>('complaints');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<StaffAccount[]>([]);
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<StaffComplaintFilters>({
    search: '',
    status: 'All',
    category: 'All',
    priority: 'All',
    technicianName: 'All',
    hostelName: 'All',
  });

  // Action Modals State
  const [assignModalComplaint, setAssignModalComplaint] = useState<Complaint | null>(null);
  const [completeModalComplaint, setCompleteModalComplaint] = useState<Complaint | null>(null);
  const [confirmModalComplaint, setConfirmModalComplaint] = useState<Complaint | null>(null);
  const [rejectModalComplaint, setRejectModalComplaint] = useState<Complaint | null>(null);
  const [approveReopenComplaint, setApproveReopenComplaint] = useState<Complaint | null>(null);
  const [selectedDetailComplaint, setSelectedDetailComplaint] = useState<Complaint | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [fetchedComplaints, fetchedTechs, fetchedHostels] = await Promise.all([
        complaintService.getStaffComplaints(
          user.role,
          user.name,
          user.hostelName,
          filters
        ),
        staffAdminService.getTechnicians(),
        staffAdminService.getHostels(),
      ]);

      setComplaints(fetchedComplaints);
      setTechnicians(fetchedTechs);
      setHostels(fetchedHostels);
    } catch (err) {
      console.error('Error loading staff complaints:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleAcknowledge = async (item: Complaint) => {
    if (!user) return;
    try {
      await complaintService.acknowledgeComplaint(item.id, user.id, user.name, user.role);
      setStatusMessage(`Acknowledged ticket ${item.referenceId}. Status is now Seen.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge');
    }
  };

  const handleStartWork = async (item: Complaint) => {
    if (!user) return;
    try {
      await complaintService.startWork(item.id, user.id, user.name, user.role);
      setStatusMessage(`Started work on ${item.referenceId}. Status is now In Progress.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to start work');
    }
  };

  const handleReprioritize = async (item: Complaint, newPriority: ComplaintPriority) => {
    if (!user) return;
    try {
      await complaintService.reprioritizeComplaint(item.id, newPriority, user.id, user.name, user.role);
      setStatusMessage(`Updated priority of ${item.referenceId} to ${newPriority}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reprioritize');
    }
  };

  const handleActionSuccess = (updated: Complaint) => {
    setStatusMessage(`Successfully updated ${updated.referenceId}. Current status: ${updated.status}.`);
    loadData();
  };

  const getRoleHeaderIcon = (role?: string) => {
    switch (role) {
      case 'Caretaker': return <UserCheck className="w-6 h-6 text-amber-600" />;
      case 'Technician': return <Wrench className="w-6 h-6 text-sky-600" />;
      case 'Warden': return <ShieldCheck className="w-6 h-6 text-purple-600" />;
      case 'Hostel Admin': return <Building2 className="w-6 h-6 text-rose-600" />;
      default: return <ShieldCheck className="w-6 h-6 text-indigo-600" />;
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'Caretaker': return 'warning';
      case 'Technician': return 'info';
      case 'Warden': return 'purple';
      case 'Hostel Admin': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Security Disclaimer Banner */}
      <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-white">Authorization Adapter Active:</strong> Evaluated via central permission map <code className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded font-mono">ROLE_PERMISSIONS</code>.
            <span className="text-slate-400 ml-1.5 hidden sm:inline">(Frontend demo; authentic role & boundary verification will be enforced on the backend in Phase 4).</span>
          </span>
        </div>
        <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
          {user?.role}
        </Badge>
      </div>

      {/* Staff Header Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              {getRoleHeaderIcon(user?.role)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {user?.name}
                </h1>
                <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
                  {user?.role} Portal
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {user?.hostelName ? `${user.hostelName} Jurisdiction` : 'Cross-Hostel Administrative Authority'} • {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Alert type="success" onDismiss={() => setStatusMessage(null)}>
          {statusMessage}
        </Alert>
      )}

      {/* Admin Specific Tabs Navigation */}
      {user?.role === 'Hostel Admin' && (
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6" aria-label="Admin Navigation Tabs">
            <button
              type="button"
              onClick={() => setActiveAdminTab('complaints')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                activeAdminTab === 'complaints'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Cross-Hostel Complaints</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                {complaints.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminTab('hostels')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                activeAdminTab === 'hostels'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hostels & Blocks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminTab('staff')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                activeAdminTab === 'staff'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Accounts & Roles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAdminTab('audit')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer ${
                activeAdminTab === 'audit'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Immutable Audit Logs</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      {user?.role === 'Hostel Admin' && activeAdminTab === 'hostels' ? (
        <HostelConfigView />
      ) : user?.role === 'Hostel Admin' && activeAdminTab === 'staff' ? (
        <StaffManagementView />
      ) : user?.role === 'Hostel Admin' && activeAdminTab === 'audit' ? (
        <AuditLogView />
      ) : (
        /* Complaints Table for Caretaker, Technician, Warden, and Admin complaints tab */
        <section aria-label="Staff Complaints Queue">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {user?.role === 'Technician' ? 'My Assigned Work Orders' : 'Operational Maintenance Tickets'}
              </h2>
              <p className="text-xs text-slate-500">
                {user?.role === 'Technician'
                  ? 'Work orders assigned to you by Caretaker. Commenced orders can be marked Work Completed.'
                  : `Tickets in ${user?.hostelName || 'All Campuses'}. Authorized actions are governed by your role.`}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Showing {complaints.length} tickets
            </span>
          </div>

          <StaffComplaintsTable
            complaints={complaints}
            isLoading={isLoading}
            filters={filters}
            onFilterChange={setFilters}
            technicians={technicians}
            hostels={hostels}
            onAcknowledge={handleAcknowledge}
            onOpenAssign={(c) => setAssignModalComplaint(c)}
            onStartWork={handleStartWork}
            onOpenComplete={(c) => setCompleteModalComplaint(c)}
            onOpenConfirm={(c) => setConfirmModalComplaint(c)}
            onOpenReject={(c) => setRejectModalComplaint(c)}
            onOpenApproveReopen={(c) => setApproveReopenComplaint(c)}
            onReprioritize={handleReprioritize}
            onViewDetails={(c) => setSelectedDetailComplaint(c)}
          />
        </section>
      )}

      {/* Action Modals */}
      <AssignTechnicianModal
        complaint={assignModalComplaint}
        isOpen={Boolean(assignModalComplaint)}
        onClose={() => setAssignModalComplaint(null)}
        onSuccess={handleActionSuccess}
      />

      <WorkCompletedModal
        complaint={completeModalComplaint}
        isOpen={Boolean(completeModalComplaint)}
        onClose={() => setCompleteModalComplaint(null)}
        onSuccess={handleActionSuccess}
      />

      <ConfirmResolutionModal
        complaint={confirmModalComplaint}
        isOpen={Boolean(confirmModalComplaint)}
        onClose={() => setConfirmModalComplaint(null)}
        onSuccess={handleActionSuccess}
      />

      <RejectComplaintModal
        complaint={rejectModalComplaint}
        isOpen={Boolean(rejectModalComplaint)}
        onClose={() => setRejectModalComplaint(null)}
        onSuccess={handleActionSuccess}
      />

      <ApproveReopenModal
        complaint={approveReopenComplaint}
        isOpen={Boolean(approveReopenComplaint)}
        onClose={() => setApproveReopenComplaint(null)}
        onSuccess={handleActionSuccess}
      />

      <ComplaintDetailModal
        complaint={selectedDetailComplaint}
        isOpen={Boolean(selectedDetailComplaint)}
        onClose={() => setSelectedDetailComplaint(null)}
        onComplaintUpdated={handleActionSuccess}
        currentStudentId={user?.id || ''}
      />
    </div>
  );
};
