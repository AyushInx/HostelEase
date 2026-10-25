import React, { useState } from 'react';
import { 
  ThumbsUp, 
  MessageSquare, 
  AlertTriangle, 
  MapPin, 
  User, 
  Send, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import type { Complaint } from '../../types/complaint';
import { complaintService } from '../../services/mockComplaintService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';

interface CommunityFeedTabProps {
  complaints: Complaint[];
  isLoading: boolean;
  currentStudentId: string;
  currentStudentName: string;
  hostelName: string;
  onRefresh: () => void;
}

export const CommunityFeedTab: React.FC<CommunityFeedTabProps> = ({
  complaints,
  isLoading,
  currentStudentId,
  currentStudentName,
  hostelName,
  onRefresh,
}) => {
  const [activeCommentComplaintId, setActiveCommentComplaintId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [reportingUnresolvedId, setReportingUnresolvedId] = useState<string | null>(null);
  const [unresolvedReason, setUnresolvedReason] = useState('');
  const [unresolvedStatusMessage, setUnresolvedStatusMessage] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);

  const handleSupportToggle = async (complaintId: string) => {
    try {
      await complaintService.toggleSupport(complaintId, currentStudentId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (complaintId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await complaintService.addComment(
        complaintId,
        currentStudentId,
        currentStudentName,
        'Student',
        commentText.trim()
      );
      setCommentText('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReportUnresolvedSubmit = async (complaintId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await complaintService.reportUnresolved(
        complaintId,
        currentStudentId,
        unresolvedReason.trim()
      );
      setUnresolvedStatusMessage({
        id: complaintId,
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setReportingUnresolvedId(null);
      setUnresolvedReason('');
      onRefresh();
    } catch (err: any) {
      setUnresolvedStatusMessage({
        id: complaintId,
        type: 'error',
        message: err.message || 'Failed to submit unresolved report',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'Reopened': return 'danger';
      case 'In Progress': return 'primary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope and Privacy Header Notice */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              {hostelName} Community Maintenance Board
            </h3>
            <p className="text-slate-500 text-[11px]">
              Scoped strictly to your residential hostel. Institutional privacy guarantees student emails & phones are never visible.
            </p>
          </div>
        </div>
        <Badge variant="primary" size="sm">
          {complaints.length} Public Issues
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 text-slate-500">
          No common hostel issues reported in {hostelName} yet.
        </div>
      ) : (
        <div className="space-y-5">
          {complaints.map((item) => {
            const hasSupported = item.supportedByStudentIds.includes(currentStudentId);
            const hasReportedUnresolved = item.unresolvedReportStudentIds.includes(currentStudentId);
            const isCommentBoxOpen = activeCommentComplaintId === item.id;
            const isReportingUnresolved = reportingUnresolvedId === item.id;
            const feedbackMessage = unresolvedStatusMessage?.id === item.id ? unresolvedStatusMessage : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {item.referenceId}
                    </span>
                    <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
                      {item.status}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {item.category}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Logged {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                {/* Location metadata (Sanitized student info) */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.block}, {item.roomNumber}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Reported by: <span className="font-medium text-slate-700">{item.studentName}</span>
                  </span>
                </div>

                {/* Status Notice if any */}
                {feedbackMessage && (
                  <Alert
                    type={feedbackMessage.type}
                    onDismiss={() => setUnresolvedStatusMessage(null)}
                  >
                    {feedbackMessage.message}
                  </Alert>
                )}

                {/* Unresolved Report Form Modal/Inline */}
                {isReportingUnresolved && (
                  <form
                    onSubmit={(e) => handleReportUnresolvedSubmit(item.id, e)}
                    className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="font-bold text-rose-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Report Issue Still Unresolved
                    </div>
                    <p className="text-rose-800">
                      If this issue affects common areas or remains pending despite closure, log your report.
                      (Enforced once per student).
                    </p>
                    <input
                      type="text"
                      placeholder="Optional notes on current status..."
                      value={unresolvedReason}
                      onChange={(e) => setUnresolvedReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-rose-300 bg-white text-slate-900"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReportingUnresolvedId(null);
                          setUnresolvedReason('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="danger" size="sm">
                        Submit Unresolved Report
                      </Button>
                    </div>
                  </form>
                )}

                {/* Action & Aggregate Counts Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Support Once Button */}
                    <button
                      type="button"
                      onClick={() => handleSupportToggle(item.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer
                        ${hasSupported
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}
                      `}
                      aria-pressed={hasSupported}
                      aria-label={`${hasSupported ? 'Supported' : 'Support this issue'}. Total supports: ${item.supportedByStudentIds.length}`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasSupported ? 'fill-indigo-600 text-indigo-600' : 'text-slate-400'}`} />
                      <span>{hasSupported ? 'Supported' : 'Support'}</span>
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-700 font-bold">
                        {item.supportedByStudentIds.length}
                      </span>
                    </button>

                    {/* Comments Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCommentComplaintId(isCommentBoxOpen ? null : item.id)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                      aria-label={`Comments: ${item.comments.length}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Discussion</span>
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-700 font-bold">
                        {item.comments.length}
                      </span>
                    </button>
                  </div>

                  {/* Report Still Unresolved Button */}
                  <div>
                    {hasReportedUnresolved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3 h-3 text-rose-600" />
                        Reported Unresolved ({item.unresolvedReportStudentIds.length})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReportingUnresolvedId(item.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        aria-label="Report this complaint as still unresolved"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Report Unresolved</span>
                        {item.unresolvedReportStudentIds.length > 0 && (
                          <span className="ml-1 text-[10px] text-slate-400">
                            ({item.unresolvedReportStudentIds.length})
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Thread */}
                {isCommentBoxOpen && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Community Comments
                    </h4>

                    {item.comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No community comments yet. Add one below.</p>
                    ) : (
                      <div className="space-y-2">
                        {item.comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{c.authorName}</span>
                                <Badge variant={c.authorRole === 'Student' ? 'primary' : 'purple'} size="sm">
                                  {c.authorRole}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Input Form */}
                    <form
                      onSubmit={(e) => handleAddComment(item.id, e)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        placeholder="Add a respectful comment or update..."
                        aria-label="Comment content"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmittingComment}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        Post
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
