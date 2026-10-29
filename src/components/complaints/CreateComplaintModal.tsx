import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Upload, 
  MapPin, 
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import type { 
  Complaint, 
  ComplaintCategory, 
  ComplaintPriority, 
  CreateComplaintInput 
} from '../../types/complaint';
import { complaintService } from '../../services/mockComplaintService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';

interface CreateComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newComplaint: Complaint) => void;
  studentId: string;
  studentName: string;
  defaultHostelName: string;
  defaultRoomNumber?: string;
}

const CATEGORIES: ComplaintCategory[] = [
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Internet/WiFi',
  'Cleanliness',
  'Civil',
  'Mess/Dining',
  'Other',
];

const PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const CreateComplaintModal: React.FC<CreateComplaintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  studentName,
  defaultHostelName,
  defaultRoomNumber = '',
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('Electrical');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [hostelName] = useState(defaultHostelName || 'Kalam Hostel');
  const [block, setBlock] = useState('B Block');
  const [roomNumber, setRoomNumber] = useState(defaultRoomNumber || 'B-304');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters';
    }

    if (!description.trim()) {
      errs.description = 'Please describe the maintenance issue';
    } else if (description.trim().length < 15) {
      errs.description = 'Description must be at least 15 characters';
    }

    if (!roomNumber.trim()) {
      errs.roomNumber = 'Room or specific location is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const input: CreateComplaintInput = {
        title,
        category,
        priority,
        hostelName,
        block,
        roomNumber,
        description,
        imageUrl,
      };

      const result = await complaintService.createComplaint(studentId, studentName, input);
      setCreatedComplaint(result);
      onSuccess(result);
    } catch {
      setErrors({ global: 'Failed to create complaint. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReference = () => {
    if (createdComplaint) {
      navigator.clipboard.writeText(createdComplaint.referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetAndClose = () => {
    setTitle('');
    setDescription('');
    setImageUrl(undefined);
    setErrors({});
    setCreatedComplaint(null);
    onClose();
  };

  // Mock photo upload handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'File size must be under 5MB' }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setErrors((prev) => {
          const { image: _, ...rest } = prev;
          return rest;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confirmation Screen */}
        {createdComplaint ? (
          <div className="text-center py-4 space-y-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-slate-900">
                Complaint Registered Successfully!
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Your maintenance ticket has been logged and queued for Caretaker review.
              </p>
            </div>

            {/* Reference Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Official Ticket Reference ID
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-extrabold font-mono text-indigo-700">
                  {createdComplaint.referenceId}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyReference}
                  leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  aria-label="Copy Ticket Reference ID"
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Use this reference number to track updates or report issues to the warden.
              </p>
            </div>

            {/* Invariant Note */}
            <div className="text-left p-3 rounded-lg bg-indigo-50 border border-indigo-200/80 text-xs text-indigo-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Security Invariant:</strong> Ticket references are tracking numbers, never access tokens. Access to private complaint actions is strictly enforced via your verified student session.
              </span>
            </div>

            <Button variant="primary" fullWidth size="lg" onClick={handleResetAndClose}>
              View in My Complaints
            </Button>
          </div>
        ) : (
          /* Submission Form */
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <PlusCircle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">New Service Request</span>
              </div>
              <h2 id="modal-title" className="text-2xl font-bold text-slate-900">
                Submit a Complaint
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All tickets generate permanent audit logs and are monitored by server-side SLA timers.
              </p>
            </div>

            {errors.global && (
              <div className="mb-4">
                <Alert type="error">{errors.global}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Title */}
              <Input
                id="complaint-title"
                label="Complaint Summary"
                required
                placeholder="e.g. Washbasin tap leaking continuously"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
                helperText="Brief summary of the issue"
              />

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="complaint-category"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Category <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="complaint-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                      className="block w-full rounded-lg border border-slate-300 py-2.5 px-3 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="complaint-priority"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Priority <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    id="complaint-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                    className="block w-full rounded-lg border border-slate-300 py-2.5 px-3 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {PRIORITIES.map((pri) => (
                      <option key={pri} value={pri}>
                        {pri} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location details */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Location Coordinates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Hostel
                    </label>
                    <input
                      type="text"
                      disabled
                      value={hostelName}
                      className="w-full text-xs bg-slate-100 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="block-select"
                      className="block text-[11px] font-medium text-slate-500 mb-1"
                    >
                      Block
                    </label>
                    <input
                      id="block-select"
                      type="text"
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-md py-1.5 px-2.5 text-slate-800 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="room-input"
                      className="block text-[11px] font-medium text-slate-500 mb-1"
                    >
                      Room / Area <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="room-input"
                      type="text"
                      required
                      placeholder="e.g. B-304"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-md py-1.5 px-2.5 text-slate-800 focus:border-indigo-500"
                    />
                  </div>
                </div>
                {errors.roomNumber && (
                  <p className="text-xs text-rose-600">{errors.roomNumber}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="complaint-desc"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Description <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  id="complaint-desc"
                  rows={3}
                  required
                  placeholder="Provide detailed description of what happened, symptoms, and urgency..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`
                    block w-full rounded-lg border text-sm py-2.5 px-3.5 bg-white text-slate-900 placeholder:text-slate-400
                    ${errors.description ? 'border-rose-400 focus:border-rose-500 ring-rose-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}
                  `}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-rose-600">{errors.description}</p>
                )}
              </div>

              {/* Optional Photo Attachment */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Attach Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Select Image (Max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Photo attached</span>
                      <button
                        type="button"
                        onClick={() => setImageUrl(undefined)}
                        className="text-slate-400 hover:text-slate-700 font-bold ml-1 cursor-pointer"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {errors.image && <p className="mt-1 text-xs text-rose-600">{errors.image}</p>}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button variant="outline" size="md" onClick={handleResetAndClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Generate Ticket
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
