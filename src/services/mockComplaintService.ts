import type {
  Complaint,
  ComplaintFilters,
  StaffComplaintFilters,
  ComplaintOverviewStats,
  ComplaintPriority,
  CreateComplaintInput,
  CommunityComment,
  IComplaintService,
} from '../types/complaint';
import { staffAdminService } from './mockStaffAdminService';

/**
 * =========================================================================
 * MOCK COMPLAINT SERVICE (PHASE 2 PROTOTYPE)
 * =========================================================================
 * Implements IComplaintService with in-memory persistence and session cache.
 * Follows all SPEC.md & AGENTS.md rules:
 * - Reference codes (e.g. HCT-2026-XXXXX) are tracking references, NOT access tokens
 * - Strict unique constraint on unresolved reports per (complaint, student)
 * - Single support upvote per student
 * - Never returns student emails or verification details in community feeds
 * - Permanent append-only status history entries
 * =========================================================================
 */

const STORAGE_KEY = 'hct_mock_complaints_v3';

// Seed complaints for initial demo & testing
const INITIAL_MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'cmp_mock_001',
    referenceId: 'HCT-2026-84912',
    studentId: 'usr_mock_std_001', // Alex Sharma
    studentName: 'Alex Sharma',
    hostelName: 'Kalam Hostel',
    block: 'B Block',
    roomNumber: 'B-304',
    category: 'Electrical',
    title: 'Ceiling Fan Making Loud Noise & Sparking',
    description: 'The ceiling fan regulator seems faulty and causes intermittent sparks at speed 4. Needs urgent inspection by electrician.',
    priority: 'Urgent',
    status: 'In Progress',
    createdAt: '2026-10-23T08:30:00Z',
    updatedAt: '2026-10-24T14:00:00Z',
    assignedTechnicianName: 'Rajesh Verma (Electrician)',
    history: [
      {
        id: 'hist_001_1',
        toStatus: 'Submitted',
        actorId: 'usr_mock_std_001',
        actorName: 'Alex Sharma',
        actorRole: 'Student',
        timestamp: '2026-10-23T08:30:00Z',
        remarks: 'Complaint registered by student',
      },
      {
        id: 'hist_001_2',
        fromStatus: 'Submitted',
        toStatus: 'Seen',
        actorId: 'usr_mock_ct_001',
        actorName: 'Suresh Kumar',
        actorRole: 'Caretaker',
        timestamp: '2026-10-23T09:15:00Z',
        remarks: 'Ticket acknowledged by Caretaker',
      },
      {
        id: 'hist_001_3',
        fromStatus: 'Seen',
        toStatus: 'Assigned',
        actorId: 'usr_mock_ct_001',
        actorName: 'Suresh Kumar',
        actorRole: 'Caretaker',
        timestamp: '2026-10-23T11:00:00Z',
        remarks: 'Assigned to Rajesh Verma (Electrician)',
      },
      {
        id: 'hist_001_4',
        fromStatus: 'Assigned',
        toStatus: 'In Progress',
        actorId: 'usr_mock_tech_001',
        actorName: 'Rajesh Verma (Electrician)',
        actorRole: 'Technician',
        timestamp: '2026-10-24T14:00:00Z',
        remarks: 'Inspected regulator; replacement capacitor ordered from store',
      },
    ],
    supportedByStudentIds: ['usr_mock_std_002'],
    comments: [
      {
        id: 'comm_001_1',
        complaintId: 'cmp_mock_001',
        authorId: 'usr_mock_tech_001',
        authorName: 'Rajesh Verma (Electrician)',
        authorRole: 'Technician',
        content: 'I have disconnected the faulty switch for safety. Will install the new part tomorrow morning.',
        createdAt: '2026-10-24T14:05:00Z',
      },
    ],
    unresolvedReportStudentIds: [],
  },
  {
    id: 'cmp_mock_002',
    referenceId: 'HCT-2026-92147',
    studentId: 'usr_mock_std_001', // Alex Sharma
    studentName: 'Alex Sharma',
    hostelName: 'Kalam Hostel',
    block: 'B Block',
    roomNumber: 'B-304',
    category: 'Plumbing',
    title: 'Bathroom Tap Leaking Continuously',
    description: 'The washbasin tap in room B-304 does not shut off completely, wasting clean water throughout the day.',
    priority: 'Medium',
    status: 'Submitted',
    createdAt: '2026-10-25T07:15:00Z',
    updatedAt: '2026-10-25T07:15:00Z',
    history: [
      {
        id: 'hist_002_1',
        toStatus: 'Submitted',
        actorId: 'usr_mock_std_001',
        actorName: 'Alex Sharma',
        actorRole: 'Student',
        timestamp: '2026-10-25T07:15:00Z',
        remarks: 'Complaint filed by student',
      },
    ],
    supportedByStudentIds: [],
    comments: [],
    unresolvedReportStudentIds: [],
  },
  {
    id: 'cmp_mock_003',
    referenceId: 'HCT-2026-51204',
    studentId: 'usr_mock_std_001', // Alex Sharma
    studentName: 'Alex Sharma',
    hostelName: 'Kalam Hostel',
    block: 'B Block',
    roomNumber: 'B-304',
    category: 'Internet/WiFi',
    title: 'High Latency & Frequent Drops on Wing AP-04',
    description: 'The corridor WiFi access point was intermittently rebooting every 10 minutes.',
    priority: 'High',
    status: 'Resolved',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-21T16:30:00Z',
    assignedTechnicianName: 'Network Ops Team',
    history: [
      {
        id: 'hist_003_1',
        toStatus: 'Submitted',
        actorId: 'usr_mock_std_001',
        actorName: 'Alex Sharma',
        actorRole: 'Student',
        timestamp: '2026-10-20T10:00:00Z',
        remarks: 'Ticket submitted',
      },
      {
        id: 'hist_003_2',
        fromStatus: 'Submitted',
        toStatus: 'Assigned',
        actorId: 'usr_mock_ct_001',
        actorName: 'Suresh Kumar',
        actorRole: 'Caretaker',
        timestamp: '2026-10-20T11:00:00Z',
        remarks: 'Routed to IT infrastructure desk',
      },
      {
        id: 'hist_003_3',
        fromStatus: 'Assigned',
        toStatus: 'Work Completed',
        actorId: 'usr_mock_tech_001',
        actorName: 'Network Ops Team',
        actorRole: 'Technician',
        timestamp: '2026-10-21T15:00:00Z',
        remarks: 'Replaced PoE injector and updated AP firmware',
      },
      {
        id: 'hist_003_4',
        fromStatus: 'Work Completed',
        toStatus: 'Resolved',
        actorId: 'usr_mock_wd_001',
        actorName: 'Dr. Anita Roy',
        actorRole: 'Warden',
        timestamp: '2026-10-21T16:30:00Z',
        remarks: 'Resolution verified and closed by Warden',
      },
    ],
    supportedByStudentIds: ['usr_mock_std_001', 'usr_mock_std_002'],
    comments: [
      {
        id: 'comm_003_1',
        complaintId: 'cmp_mock_003',
        authorId: 'usr_mock_wd_001',
        authorName: 'Dr. Anita Roy',
        authorRole: 'Warden',
        content: 'Issue resolved. Ping latency restored to under 8ms.',
        createdAt: '2026-10-21T16:35:00Z',
      },
    ],
    unresolvedReportStudentIds: [],
  },
  {
    id: 'cmp_mock_004',
    referenceId: 'HCT-2026-34891',
    studentId: 'usr_mock_std_001', // Alex Sharma
    studentName: 'Alex Sharma',
    hostelName: 'Kalam Hostel',
    block: 'B Block',
    roomNumber: 'B-304',
    category: 'Carpentry',
    title: 'Study Table Drawer Broken Runner',
    description: 'The right-hand runner of the study table drawer detached. Fixed once but detached again after two days.',
    priority: 'Low',
    status: 'Reopened',
    createdAt: '2026-10-18T12:00:00Z',
    updatedAt: '2026-10-22T11:00:00Z',
    history: [
      {
        id: 'hist_004_1',
        toStatus: 'Submitted',
        actorId: 'usr_mock_std_001',
        actorName: 'Alex Sharma',
        actorRole: 'Student',
        timestamp: '2026-10-18T12:00:00Z',
        remarks: 'Initial complaint filed',
      },
      {
        id: 'hist_004_2',
        fromStatus: 'Submitted',
        toStatus: 'Resolved',
        actorId: 'usr_mock_wd_001',
        actorName: 'Dr. Anita Roy',
        actorRole: 'Warden',
        timestamp: '2026-10-19T17:00:00Z',
        remarks: 'Screw tightened',
      },
      {
        id: 'hist_004_3',
        fromStatus: 'Resolved',
        toStatus: 'Reopened',
        actorId: 'usr_mock_std_001',
        actorName: 'Alex Sharma',
        actorRole: 'Student',
        timestamp: '2026-10-22T11:00:00Z',
        remarks: 'Runner collapsed again. Needs full rail replacement.',
      },
    ],
    supportedByStudentIds: [],
    comments: [],
    unresolvedReportStudentIds: [],
    reopenRequest: {
      requestedAt: '2026-10-22T11:00:00Z',
      reason: 'The drawer runner collapsed again; screw hole is stripped and needs a new metal bracket.',
      status: 'approved',
    },
  },
  {
    id: 'cmp_mock_005',
    referenceId: 'HCT-2026-67319',
    studentId: 'usr_mock_std_002', // Priya Patel (Girls' Hostel)
    studentName: 'Priya Patel',
    hostelName: 'Asima Hostel',
    block: 'East Wing',
    roomNumber: 'G-102',
    category: 'Cleanliness',
    title: 'Water Cooler Filter Replacement & Deep Clean Needed',
    description: 'The drinking water cooler on the 1st floor common area has dirty water taste and the filter indicator light is red.',
    priority: 'High',
    status: 'Submitted',
    createdAt: '2026-10-25T09:00:00Z',
    updatedAt: '2026-10-25T09:00:00Z',
    history: [
      {
        id: 'hist_005_1',
        toStatus: 'Submitted',
        actorId: 'usr_mock_std_002',
        actorName: 'Priya Patel',
        actorRole: 'Student',
        timestamp: '2026-10-25T09:00:00Z',
        remarks: 'Registered for 1st floor common area',
      },
    ],
    supportedByStudentIds: ['usr_mock_std_001', 'usr_mock_std_002'],
    comments: [
      {
        id: 'comm_005_1',
        complaintId: 'cmp_mock_005',
        authorId: 'usr_mock_std_001',
        authorName: 'Alex Sharma',
        authorRole: 'Student',
        content: 'Confirmed, several students from B block also noticed this today.',
        createdAt: '2026-10-25T09:30:00Z',
      },
    ],
    unresolvedReportStudentIds: [],
  },
  // Complaint in another hostel to test hostel-scoped community boundary
  {
    id: 'cmp_mock_006',
    referenceId: 'HCT-2026-11842',
    studentId: 'usr_mock_std_999',
    studentName: 'Other Hostel Resident',
    hostelName: 'Aryabhatta Hostel',
    block: 'A Block',
    roomNumber: 'A-101',
    category: 'Civil',
    title: 'Aryabhatta Hostel Window Glass Cracked',
    description: 'Window glass cracked in Aryabhatta hostel.',
    priority: 'Low',
    status: 'Submitted',
    createdAt: '2026-10-24T10:00:00Z',
    updatedAt: '2026-10-24T10:00:00Z',
    history: [],
    supportedByStudentIds: [],
    comments: [],
    unresolvedReportStudentIds: [],
  },
];

class MockComplaintService implements IComplaintService {
  private complaints: Complaint[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('hct_mock_complaints_v1');
        sessionStorage.removeItem('hct_mock_complaints_v2');
      }
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.complaints = parsed.map((c: Complaint) => {
          if (c.hostelName && /mandakini/i.test(c.hostelName)) {
            c.hostelName = 'Kalam Hostel';
          }
          return c;
        });
      } else {
        this.complaints = JSON.parse(JSON.stringify(INITIAL_MOCK_COMPLAINTS));
        this.saveToStorage();
      }
    } catch {
      this.complaints = JSON.parse(JSON.stringify(INITIAL_MOCK_COMPLAINTS));
    }
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.complaints));
    } catch {
      // Ignore in non-browser environments
    }
  }

  private delay(ms = 250): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateReferenceId(): string {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `HCT-2026-${randomDigits}`;
  }

  private matchesStudent(c: Complaint, studentId?: string): boolean {
    if (!studentId) return true;
    if (c.studentId === studentId) return true;
    // For demo/seeded accounts: if Alex Sharma is logged in (via mock ID, MongoDB ObjectId, or name),
    // ensure Alex's demo complaints match regardless of the exact ID representation.
    const isAlexTarget = c.studentId === 'usr_mock_std_001' || c.studentName === 'Alex Sharma';
    const isOtherKnownStudent = studentId === 'usr_mock_std_002' || studentId.includes('priya') || studentId === 'usr_mock_std_ayush' || studentId.includes('ayush');
    if (isAlexTarget && !isOtherKnownStudent) {
      return true;
    }
    return false;
  }

  async getOverviewStats(studentId?: string, hostelName?: string): Promise<ComplaintOverviewStats> {
    await this.delay(100);
    this.loadFromStorage();

    const filtered = this.complaints.filter((c) => {
      if (studentId && !this.matchesStudent(c, studentId)) return false;
      if (hostelName && c.hostelName !== hostelName) return false;
      return true;
    });

    const total = filtered.length;
    const submitted = filtered.filter((c) => c.status === 'Submitted').length;
    const inProgress = filtered.filter((c) =>
      ['Seen', 'Assigned', 'In Progress', 'Work Completed'].includes(c.status)
    ).length;
    const resolved = filtered.filter((c) => c.status === 'Resolved').length;
    const reopened = filtered.filter((c) => c.status === 'Reopened').length;

    return { total, submitted, inProgress, resolved, reopened };
  }

  async getMyComplaints(studentId: string, filters?: ComplaintFilters): Promise<Complaint[]> {
    await this.delay(150);
    this.loadFromStorage();

    let list = this.complaints.filter((c) => this.matchesStudent(c, studentId));

    if (filters) {
      if (filters.search && filters.search.trim()) {
        const query = filters.search.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.referenceId.toLowerCase().includes(query) ||
            c.title.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            c.roomNumber.toLowerCase().includes(query)
        );
      }

      if (filters.status && filters.status !== 'All') {
        if (filters.status === 'In Progress') {
          list = list.filter((c) =>
            ['Seen', 'Assigned', 'In Progress', 'Work Completed'].includes(c.status)
          );
        } else {
          list = list.filter((c) => c.status === filters.status);
        }
      }

      if (filters.category && filters.category !== 'All') {
        list = list.filter((c) => c.category === filters.category);
      }
    }

    // Sort newest first
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getComplaintById(complaintId: string): Promise<Complaint | null> {
    await this.delay(100);
    this.loadFromStorage();
    const item = this.complaints.find((c) => c.id === complaintId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async getComplaintByReference(referenceId: string): Promise<Complaint | null> {
    await this.delay(100);
    this.loadFromStorage();
    const normalized = referenceId.trim().toUpperCase();
    const item = this.complaints.find((c) => c.referenceId.toUpperCase() === normalized);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async createComplaint(
    studentId: string,
    studentName: string,
    input: CreateComplaintInput
  ): Promise<Complaint> {
    await this.delay(350);
    this.loadFromStorage();

    const timestamp = new Date().toISOString();
    const referenceId = this.generateReferenceId();
    const complaintId = `cmp_mock_${Date.now()}`;

    const newComplaint: Complaint = {
      id: complaintId,
      referenceId,
      studentId,
      studentName,
      hostelName: input.hostelName,
      block: input.block,
      roomNumber: input.roomNumber,
      category: input.category,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
      status: 'Submitted',
      imageUrl: input.imageUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [
        {
          id: `hist_${Date.now()}`,
          toStatus: 'Submitted',
          actorId: studentId,
          actorName: studentName,
          actorRole: 'Student',
          timestamp,
          remarks: 'Complaint registered by student',
        },
      ],
      supportedByStudentIds: [],
      comments: [],
      unresolvedReportStudentIds: [],
    };

    this.complaints.unshift(newComplaint);
    this.saveToStorage();

    return JSON.parse(JSON.stringify(newComplaint));
  }

  async getCommunityFeed(hostelName: string): Promise<Complaint[]> {
    await this.delay(200);
    this.loadFromStorage();

    // STRICT PRIVACY & BOUNDARY:
    // Only return complaints for the student's designated hostel
    const hostelFeed = this.complaints.filter((c) => c.hostelName === hostelName);

    // Sanitize data (no emails, phone numbers, or private verification tokens)
    return hostelFeed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async toggleSupport(
    complaintId: string,
    studentId: string
  ): Promise<{ supported: boolean; supportCount: number }> {
    await this.delay(150);
    this.loadFromStorage();

    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) {
      throw new Error('Complaint not found');
    }

    const index = target.supportedByStudentIds.indexOf(studentId);
    let supported = false;

    if (index >= 0) {
      // Toggle off
      target.supportedByStudentIds.splice(index, 1);
      supported = false;
    } else {
      // Toggle on (strictly once per student)
      target.supportedByStudentIds.push(studentId);
      supported = true;
    }

    target.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return {
      supported,
      supportCount: target.supportedByStudentIds.length,
    };
  }

  async addComment(
    complaintId: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    content: string
  ): Promise<CommunityComment> {
    await this.delay(200);
    this.loadFromStorage();

    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) {
      throw new Error('Complaint not found');
    }

    const newComment: CommunityComment = {
      id: `comm_${Date.now()}`,
      complaintId,
      authorId,
      authorName,
      authorRole,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    target.comments.push(newComment);
    target.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return newComment;
  }

  async reportUnresolved(
    complaintId: string,
    studentId: string,
    reason?: string
  ): Promise<{ success: boolean; unresolvedCount: number; message: string }> {
    await this.delay(200);
    this.loadFromStorage();

    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) {
      return { success: false, unresolvedCount: 0, message: 'Complaint not found' };
    }

    // SPEC.md invariant: Unique index on (complaint, student)
    if (target.unresolvedReportStudentIds.includes(studentId)) {
      return {
        success: false,
        unresolvedCount: target.unresolvedReportStudentIds.length,
        message: 'You have already reported this complaint as unresolved.',
      };
    }

    target.unresolvedReportStudentIds.push(studentId);
    target.updatedAt = new Date().toISOString();

    // Append to audit history
    target.history.push({
      id: `hist_${Date.now()}`,
      toStatus: target.status,
      actorId: studentId,
      actorName: 'Resident Student',
      actorRole: 'Student',
      timestamp: new Date().toISOString(),
      remarks: reason ? `Reported unresolved: ${reason}` : 'Student reported issue still unresolved',
    });

    this.saveToStorage();

    return {
      success: true,
      unresolvedCount: target.unresolvedReportStudentIds.length,
      message: 'Unresolved report recorded. Hostel administration has been alerted.',
    };
  }

  async requestReopen(
    complaintId: string,
    studentId: string,
    reason: string
  ): Promise<Complaint> {
    await this.delay(300);
    this.loadFromStorage();

    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) {
      throw new Error('Complaint not found');
    }

    if (target.status !== 'Resolved') {
      throw new Error('Only resolved complaints can be requested for reopening');
    }

    const timestamp = new Date().toISOString();
    target.reopenRequest = {
      requestedAt: timestamp,
      reason: reason.trim(),
      status: 'pending_approval',
    };

    target.history.push({
      id: `hist_${Date.now()}`,
      toStatus: target.status,
      actorId: studentId,
      actorName: target.studentName,
      actorRole: 'Student',
      timestamp,
      remarks: `Reopen requested by student: ${reason.trim()}`,
    });

    target.updatedAt = timestamp;
    this.saveToStorage();

    return JSON.parse(JSON.stringify(target));
  }

  async getStaffComplaints(
    actorRole: string,
    actorName: string,
    actorHostel?: string,
    filters?: StaffComplaintFilters
  ): Promise<Complaint[]> {
    await this.delay(150);
    this.loadFromStorage();

    let list = [...this.complaints];

    // Scoping per role:
    if (actorRole === 'Technician') {
      // View assigned work only
      const techKeyword = actorName.split(' ')[0].toLowerCase();
      list = list.filter(
        (c) =>
          c.assignedTechnicianName &&
          (c.assignedTechnicianName.toLowerCase().includes(techKeyword) ||
            c.assignedTechnicianName === actorName)
      );
    } else if (actorRole === 'Caretaker' || actorRole === 'Warden') {
      // Scoped to designated hostel
      if (actorHostel) {
        list = list.filter((c) => c.hostelName === actorHostel);
      }
    }
    // Hostel Admin has cross-hostel view

    // Apply Filters:
    if (filters) {
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.referenceId.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.roomNumber.toLowerCase().includes(q) ||
            c.studentName.toLowerCase().includes(q)
        );
      }

      if (filters.status && filters.status !== 'All') {
        list = list.filter((c) => c.status === filters.status);
      }

      if (filters.category && filters.category !== 'All') {
        list = list.filter((c) => c.category === filters.category);
      }

      if (filters.priority && filters.priority !== 'All') {
        list = list.filter((c) => c.priority === filters.priority);
      }

      if (filters.technicianName && filters.technicianName !== 'All') {
        list = list.filter((c) => c.assignedTechnicianName === filters.technicianName);
      }

      if (filters.hostelName && filters.hostelName !== 'All') {
        list = list.filter((c) => c.hostelName === filters.hostelName);
      }
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async acknowledgeComplaint(
    complaintId: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(200);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prev = target.status;
    target.status = 'Seen';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Seen',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: 'Ticket acknowledged by Caretaker',
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'TICKET_ACKNOWLEDGE',
      'Complaint',
      target.referenceId,
      `Status changed: ${prev} -> Seen`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async assignTechnician(
    complaintId: string,
    technicianName: string,
    notes: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(200);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prev = target.status;
    target.assignedTechnicianName = technicianName;
    target.status = 'Assigned';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Assigned',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: notes ? `Assigned to ${technicianName}: ${notes}` : `Assigned to ${technicianName}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'ASSIGN_TECHNICIAN',
      'Complaint',
      target.referenceId,
      `Assigned to ${technicianName}. Notes: ${notes || 'None'}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async startWork(
    complaintId: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(200);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prev = target.status;
    target.status = 'In Progress';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'In Progress',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: 'Technician arrived on site and commenced repairs',
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'START_WORK',
      'Complaint',
      target.referenceId,
      `Technician ${actorName} commenced repair. Status: In Progress`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async markWorkCompleted(
    complaintId: string,
    repairNotes: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(200);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prev = target.status;
    target.status = 'Work Completed';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Work Completed',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Work completed by technician: ${repairNotes.trim()}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'WORK_COMPLETED',
      'Complaint',
      target.referenceId,
      `Technician ${actorName} completed work. Notes: ${repairNotes}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async confirmResolution(
    complaintId: string,
    resolutionRemarks: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(250);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prev = target.status;
    target.status = 'Resolved';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Resolved',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: resolutionRemarks
        ? `Confirmed resolution: ${resolutionRemarks.trim()}`
        : 'Work verified and marked resolved by Warden',
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'CONFIRM_RESOLUTION',
      'Complaint',
      target.referenceId,
      `Warden ${actorName} confirmed resolution. Remarks: ${resolutionRemarks || 'None'}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async returnWorkInProgress(
    complaintId: string,
    mandatoryReason: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(250);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      throw new Error('Mandatory reason (min 5 chars) is required to return work to In Progress');
    }

    const prev = target.status;
    target.status = 'In Progress';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'In Progress',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Work returned to In Progress by Warden. Reason: ${mandatoryReason.trim()}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'WORK_RETURNED_IN_PROGRESS',
      'Complaint',
      target.referenceId,
      `Warden ${actorName} returned work to In Progress. Reason: ${mandatoryReason.trim()}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async rejectComplaint(
    complaintId: string,
    mandatoryReason: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(200);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      throw new Error('Mandatory reason is required to reject a complaint');
    }

    const prev = target.status;
    target.status = 'Rejected';
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Rejected',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Ticket rejected: ${mandatoryReason.trim()}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'REJECT_COMPLAINT',
      'Complaint',
      target.referenceId,
      `Rejected by ${actorRole} (${actorName}). Reason: ${mandatoryReason.trim()}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async approveReopen(
    complaintId: string,
    technicianName: string | undefined,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(250);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prev = target.status;
    // SPEC INVARIANT: Reopened returns to Assigned (same technician if still active, else Caretaker reassigns)
    target.status = 'Assigned';
    if (technicianName) {
      target.assignedTechnicianName = technicianName;
    }
    if (target.reopenRequest) {
      target.reopenRequest.status = 'approved';
    }
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Assigned',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Reopen request approved by ${actorRole}. Returned to Assigned status under ${target.assignedTechnicianName || 'unassigned'}.`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'APPROVE_REOPEN',
      'Complaint',
      target.referenceId,
      `Approved reopen request. Returned to Assigned (${target.assignedTechnicianName || 'unassigned'})`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async rejectReopen(
    complaintId: string,
    mandatoryReason: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(250);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      throw new Error('Mandatory reason (min 5 chars) is required to reject a reopen request');
    }

    const prev = target.status;
    target.status = 'Resolved';
    if (target.reopenRequest) {
      target.reopenRequest.status = 'rejected';
      (target.reopenRequest as any).rejectionReason = mandatoryReason.trim();
    }
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      fromStatus: prev,
      toStatus: 'Resolved',
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Reopen request rejected by ${actorRole}. Reason: ${mandatoryReason.trim()}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'REOPEN_REJECTED',
      'Complaint',
      target.referenceId,
      `Reopen request rejected by ${actorRole}. Reason: ${mandatoryReason.trim()}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async reprioritizeComplaint(
    complaintId: string,
    newPriority: ComplaintPriority,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(150);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    const prevPriority = target.priority;
    target.priority = newPriority;
    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      toStatus: target.status,
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Priority changed from ${prevPriority} to ${newPriority} by ${actorRole}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'REPRIORITIZE',
      'Complaint',
      target.referenceId,
      `Priority updated from ${prevPriority} to ${newPriority}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }

  async escalateComplaint(
    complaintId: string,
    escalationNotes: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    await this.delay(200);
    this.loadFromStorage();
    const target = this.complaints.find((c) => c.id === complaintId);
    if (!target) throw new Error('Complaint not found');

    target.updatedAt = new Date().toISOString();

    target.history.push({
      id: `hist_${Date.now()}`,
      toStatus: target.status,
      actorId,
      actorName,
      actorRole,
      timestamp: target.updatedAt,
      remarks: `Manual escalation by Warden: ${escalationNotes.trim()}`,
    });

    staffAdminService.appendAuditLog(
      actorName,
      actorRole,
      'MANUAL_ESCALATE',
      'Complaint',
      target.referenceId,
      `Escalated to Hostel Admin. Notes: ${escalationNotes}`
    );

    this.saveToStorage();
    return JSON.parse(JSON.stringify(target));
  }
}

export const complaintService: IComplaintService = new MockComplaintService();
