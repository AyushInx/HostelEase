import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  CheckCircle2, 
  RotateCcw, 
  ShieldAlert
} from 'lucide-react';
import type { Complaint } from '../../types/complaint';
import type { StaffAccount } from '../../services/mockStaffAdminService';
import { staffAdminService } from '../../services/mockStaffAdminService';
import { complaintService } from '../../services/mockComplaintService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

// -------------------------------------------------------------
// 1. Assign Technician Modal (Caretaker)
// -------------------------------------------------------------
export const AssignTechnicianModal: React.FC<{
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}> = ({ complaint, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<StaffAccount[]>([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      staffAdminService.getTechnicians().then((techs) => {
        setTechnicians(techs);
        if (techs.length > 0) setSelectedTech(techs[0].name);
      });
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !complaint || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech) {
      setError('Please select a technician.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await complaintService.assignTechnician(
        complaint.id,
        selectedTech,
        notes,
        user.id,
        user.name,
        user.role
      );
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign technician');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Wrench className="w-5 h-5" />
            <h3 id="assign-modal-title" className="font-bold text-base text-slate-900">
              Assign Technician
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Assign ticket <span className="font-mono font-bold text-slate-700">{complaint.referenceId}</span> ({complaint.category}) to a duty technician.
        </p>

        {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tech-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Select Qualified Technician
            </label>
            <select
              id="tech-select"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-indigo-500"
            >
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.name}>
                  {tech.name} {tech.specialization ? `(${tech.specialization})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tech-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Work Instructions / Priority Notes
            </label>
            <textarea
              id="tech-notes"
              rows={3}
              placeholder="e.g. Inspect junction box and bring 30A replacement fuse..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Assign & Route Work Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. Mark Work Completed Modal (Technician)
// -------------------------------------------------------------
export const WorkCompletedModal: React.FC<{
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}> = ({ complaint, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [repairNotes, setRepairNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !complaint || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairNotes.trim() || repairNotes.trim().length < 8) {
      setError('Please provide specific repair notes detailing the fix (min 8 characters).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await complaintService.markWorkCompleted(
        complaint.id,
        repairNotes,
        user.id,
        user.name,
        user.role
      );
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete work');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h3 id="complete-modal-title" className="font-bold text-base text-slate-900">
              Mark Work Completed
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-3">
          <strong>Technician Role Invariant:</strong> Technicians mark work as completed. Final resolution is confirmed exclusively by the Warden.
        </div>

        {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="repair-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Field Repair Log & Parts Replaced <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="repair-notes"
              rows={3}
              required
              placeholder="e.g. Replaced 25uF capacitor in fan regulator and tested speed control. Noise eliminated."
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm" isLoading={isLoading}>
              Submit Work Order for Warden Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. Confirm Resolution Modal (Warden)
// -------------------------------------------------------------
export const ConfirmResolutionModal: React.FC<{
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}> = ({ complaint, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !complaint || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await complaintService.confirmResolution(
        complaint.id,
        remarks,
        user.id,
        user.name,
        user.role
      );
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm resolution');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <h3 id="confirm-modal-title" className="font-bold text-base text-slate-900">
              Confirm Resolution & Close Ticket
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          As Warden, verify that the maintenance work for <span className="font-mono font-bold text-slate-800">{complaint.referenceId}</span> has satisfied safety and residential standards.
        </p>

        {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="confirm-remarks" className="block text-xs font-semibold text-slate-700 mb-1">
              Warden Inspection Remarks (Optional)
            </label>
            <textarea
              id="confirm-remarks"
              rows={2}
              placeholder="e.g. Work inspected on site; resident confirmed working properly."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Confirm Final Resolution
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. Reject Complaint Modal (Caretaker & Warden Only)
// -------------------------------------------------------------
export const RejectComplaintModal: React.FC<{
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}> = ({ complaint, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !complaint || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 6) {
      setError('A mandatory textual reason is required to reject a complaint (min 6 characters).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await complaintService.rejectComplaint(
        complaint.id,
        reason,
        user.id,
        user.name,
        user.role
      );
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject complaint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 id="reject-modal-title" className="font-bold text-base text-slate-900">
              Reject Complaint
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 mb-3">
          <strong>SPEC Invariant:</strong> Rejection is strictly restricted to Caretakers and Wardens. A permanent audit entry with mandatory reason is logged.
        </div>

        {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reject-reason" className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              required
              placeholder="e.g. Duplicate of existing ticket HCT-2026-84912 / Out of scope for residential maintenance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isLoading}>
              Reject Ticket & Write Audit Log
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. Approve Reopen Modal (Caretaker & Warden Only)
// -------------------------------------------------------------
export const ApproveReopenModal: React.FC<{
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}> = ({ complaint, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<StaffAccount[]>([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      staffAdminService.getTechnicians().then((techs) => {
        setTechnicians(techs);
        const prev = complaint?.assignedTechnicianName;
        const exists = techs.some((t) => t.name === prev);
        setSelectedTech(exists ? prev! : techs[0]?.name || '');
      });
      setError(null);
    }
  }, [isOpen, complaint]);

  if (!isOpen || !complaint || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await complaintService.approveReopen(
        complaint.id,
        selectedTech,
        user.id,
        user.name,
        user.role
      );
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve reopen request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-rose-600">
            <RotateCcw className="w-5 h-5" />
            <h3 id="approve-modal-title" className="font-bold text-base text-slate-900">
              Approve Reopen Request
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 mb-4">
          <div className="font-semibold text-slate-800">Student Reopen Justification:</div>
          <p className="italic text-slate-600">
            "{complaint.reopenRequest?.reason || 'No detailed remarks'}"
          </p>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          <strong>SPEC Invariant:</strong> Upon approval, the ticket status returns directly to <span className="font-semibold text-slate-800">Assigned</span>.
        </p>

        {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reopen-tech" className="block text-xs font-semibold text-slate-700 mb-1">
              Assign to Technician
            </label>
            <select
              id="reopen-tech"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-indigo-500"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} {t.name === complaint.assignedTechnicianName ? '(Previous Assigned)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Approve & Return to Assigned
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
