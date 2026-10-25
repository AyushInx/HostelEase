import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  RotateCcw, 
  ShieldCheck, 
  Image as ImageIcon
} from 'lucide-react';
import type { Complaint } from '../../types/complaint';
import { complaintService } from '../../services/mockComplaintService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';
import { ComplaintTimeline } from './ComplaintTimeline';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onComplaintUpdated: (updated: Complaint) => void;
  currentStudentId: string;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onComplaintUpdated,
  currentStudentId,
}) => {
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [reopenSuccessMessage, setReopenSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !complaint) return null;

  const handleRequestReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    setReopenError(null);

    if (!reopenReason.trim() || reopenReason.trim().length < 10) {
      setReopenError('Please provide a specific reason (at least 10 characters) explaining why this issue is not resolved.');
      return;
    }

    setIsSubmittingReopen(true);
    try {
      const updated = await complaintService.requestReopen(
        complaint.id,
        currentStudentId,
        reopenReason.trim()
      );
      onComplaintUpdated(updated);
      setReopenSuccessMessage('Reopen request submitted. Per hostel policy, Warden or Caretaker will review and return ticket to Assigned.');
      setShowReopenForm(false);
      setReopenReason('');
    } catch (err: any) {
      setReopenError(err.message || 'Failed to submit reopen request.');
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'Reopened': return 'danger';
      case 'In Progress': return 'primary';
      case 'Work Completed': return 'info';
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-slate-100 pb-4 mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono font-bold text-sm bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {complaint.referenceId}
            </span>
            <Badge variant={getStatusBadgeVariant(complaint.status)}>
              {complaint.status}
            </Badge>
            <Badge variant={getPriorityBadgeVariant(complaint.priority)}>
              {complaint.priority} Priority
            </Badge>
            <Badge variant="default">
              {complaint.category}
            </Badge>
          </div>

          <h2 id="ticket-detail-title" className="text-xl sm:text-2xl font-bold text-slate-900">
            {complaint.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {complaint.hostelName}, {complaint.block}, Room {complaint.roomNumber}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Logged: {new Date(complaint.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-6 flex-1 pr-1">
          {/* Success notice */}
          {reopenSuccessMessage && (
            <Alert type="success" onDismiss={() => setReopenSuccessMessage(null)}>
              {reopenSuccessMessage}
            </Alert>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Problem Description
            </h3>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </div>
          </div>

          {/* Image preview if present */}
          {complaint.imageUrl && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Attached Photograph
              </h3>
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-64 bg-slate-100 flex items-center justify-center">
                <img
                  src={complaint.imageUrl}
                  alt="Complaint attachment"
                  className="max-h-64 object-contain"
                />
              </div>
            </div>
          )}

          {/* Reopen Request State if pending */}
          {complaint.reopenRequest && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-rose-950">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  Reopen Request Pending Approval
                </span>
                <span className="text-slate-500 text-[11px]">
                  {new Date(complaint.reopenRequest.requestedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-rose-800 leading-relaxed">
                <strong>Reason:</strong> {complaint.reopenRequest.reason}
              </p>
              <p className="text-[11px] text-rose-700/80">
                Awaiting approval by Caretaker or Warden. Once approved, ticket returns to <strong className="font-semibold">Assigned</strong> status.
              </p>
            </div>
          )}

          {/* Reopen Workflow trigger (Available for Resolved tickets without pending reopen) */}
          {complaint.status === 'Resolved' && !complaint.reopenRequest && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90">
              {!showReopenForm ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">
                      Problem not resolved or recurring?
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      You can request reopening. Warden or Caretaker approval is required.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReopenForm(true)}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
                  >
                    Request Reopen
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRequestReopen} className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    Submit Reopen Request
                  </h4>
                  <p className="text-xs text-slate-600">
                    Explain why the previous repair was incomplete or how the issue recurred:
                  </p>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. The leak resumed after pressure returned this morning..."
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 bg-white text-slate-900"
                  />
                  {reopenError && <p className="text-xs text-rose-600">{reopenError}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowReopenForm(false);
                        setReopenError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="danger"
                      size="sm"
                      isLoading={isSubmittingReopen}
                    >
                      Submit Reopen Request
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Lifecycle & Status History Timeline */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Lifecycle Milestone Audit Trail
            </h3>
            <ComplaintTimeline history={complaint.history} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Append-only audit trail verified
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
