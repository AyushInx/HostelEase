export type ComplaintCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Carpentry'
  | 'Internet/WiFi'
  | 'Cleanliness'
  | 'Civil'
  | 'Mess/Dining'
  | 'Other';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ComplaintStatus =
  | 'Submitted'
  | 'Seen'
  | 'Assigned'
  | 'In Progress'
  | 'Work Completed'
  | 'Resolved'
  | 'Rejected'
  | 'Reopened';

export interface StatusHistoryEntry {
  id: string;
  fromStatus?: ComplaintStatus;
  toStatus: ComplaintStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  remarks?: string;
}

export interface CommunityComment {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  // NOTE: Student emails, phone numbers, and tokens are NEVER included here
  content: string;
  createdAt: string;
}

export interface ReopenRequest {
  requestedAt: string;
  reason: string;
  status: 'pending_approval' | 'approved' | 'rejected';
}

export interface Complaint {
  id: string;
  referenceId: string; // e.g. HCT-2026-78421 (Reference is NOT an access token)
  studentId: string;
  studentName: string; // Display name only
  hostelName: string;
  block: string;
  roomNumber: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  assignedTechnicianName?: string;
  history: StatusHistoryEntry[];
  supportedByStudentIds: string[]; // Set of student IDs who supported (1 per student)
  comments: CommunityComment[];
  unresolvedReportStudentIds: string[]; // Enforces unique index on (complaint, student)
  reopenRequest?: ReopenRequest;
}

export interface ComplaintOverviewStats {
  total: number;
  submitted: number;
  inProgress: number; // Seen, Assigned, In Progress, Work Completed
  resolved: number;
  reopened: number;
}

export interface CreateComplaintInput {
  title: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  description: string;
  hostelName: string;
  block: string;
  roomNumber: string;
  imageUrl?: string;
}

export interface ComplaintFilters {
  search?: string;
  status?: ComplaintStatus | 'All';
  category?: ComplaintCategory | 'All';
}

export interface IComplaintService {
  getOverviewStats(studentId?: string, hostelName?: string): Promise<ComplaintOverviewStats>;
  getMyComplaints(studentId: string, filters?: ComplaintFilters): Promise<Complaint[]>;
  getComplaintById(complaintId: string): Promise<Complaint | null>;
  getComplaintByReference(referenceId: string): Promise<Complaint | null>;
  createComplaint(studentId: string, studentName: string, input: CreateComplaintInput): Promise<Complaint>;
  getCommunityFeed(hostelName: string): Promise<Complaint[]>;
  toggleSupport(complaintId: string, studentId: string): Promise<{ supported: boolean; supportCount: number }>;
  addComment(complaintId: string, authorId: string, authorName: string, authorRole: string, content: string): Promise<CommunityComment>;
  reportUnresolved(complaintId: string, studentId: string, reason?: string): Promise<{ success: boolean; unresolvedCount: number; message: string }>;
  requestReopen(complaintId: string, studentId: string, reason: string): Promise<Complaint>;
}
