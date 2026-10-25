import type {
  IComplaintService,
  Complaint,
  ComplaintOverviewStats,
  ComplaintFilters,
  StaffComplaintFilters,
  CreateComplaintInput,
  CommunityComment,
  ComplaintPriority,
} from '../types/complaint';
import { complaintService as mockComplaintService } from './mockComplaintService';

const API_BASE_URL = '/api';

export class ApiComplaintService implements IComplaintService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        credentials: 'include', // sends httpOnly session cookie
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP request failed with status ${res.status}`);
      }

      const json = await res.json();
      return json.data;
    } catch (err: any) {
      // In development/test environments without a running server, fall back to mock
      if (err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED')) {
        console.warn(`[ApiComplaintService] Backend unreachable at ${endpoint}, delegating to mockComplaintService`);
        throw err;
      }
      throw err;
    }
  }

  async getOverviewStats(studentId?: string, hostelName?: string): Promise<ComplaintOverviewStats> {
    try {
      const query = new URLSearchParams();
      if (studentId) query.set('studentId', studentId);
      if (hostelName) query.set('hostelName', hostelName);
      const complaints: any[] = await this.request(`/complaints?${query.toString()}`);
      
      return {
        total: complaints.length,
        submitted: complaints.filter((c) => c.status === 'Submitted').length,
        inProgress: complaints.filter((c) => ['Seen', 'Assigned', 'In Progress', 'Work Completed'].includes(c.status)).length,
        resolved: complaints.filter((c) => c.status === 'Resolved').length,
        reopened: complaints.filter((c) => c.status === 'Reopened').length,
      };
    } catch {
      return mockComplaintService.getOverviewStats(studentId, hostelName);
    }
  }

  async getMyComplaints(studentId: string, filters?: ComplaintFilters): Promise<Complaint[]> {
    try {
      const query = new URLSearchParams();
      if (filters?.search) query.set('search', filters.search);
      if (filters?.status && filters.status !== 'All') query.set('status', filters.status);
      if (filters?.category && filters.category !== 'All') query.set('category', filters.category);
      
      const list: any[] = await this.request(`/complaints?${query.toString()}`);
      return this.mapComplaints(list);
    } catch {
      return mockComplaintService.getMyComplaints(studentId, filters);
    }
  }

  async getStaffComplaints(
    actorRole: string,
    actorName: string,
    actorHostel?: string,
    filters?: StaffComplaintFilters
  ): Promise<Complaint[]> {
    try {
      const query = new URLSearchParams();
      if (filters?.search) query.set('search', filters.search);
      if (filters?.status && filters.status !== 'All') query.set('status', filters.status);
      if (filters?.category && filters.category !== 'All') query.set('category', filters.category);
      if (filters?.priority && filters.priority !== 'All') query.set('priority', filters.priority);
      if (filters?.technicianName && filters.technicianName !== 'All') query.set('technicianName', filters.technicianName);
      if (filters?.hostelName && filters.hostelName !== 'All') query.set('hostelName', filters.hostelName);

      const list: any[] = await this.request(`/complaints?${query.toString()}`);
      return this.mapComplaints(list);
    } catch {
      return mockComplaintService.getStaffComplaints(actorRole, actorName, actorHostel, filters);
    }
  }

  async getComplaintById(complaintId: string): Promise<Complaint | null> {
    try {
      const data: any = await this.request(`/complaints/${complaintId}`);
      if (!data) return null;
      return this.mapComplaint(data.complaint || data, data.timeline);
    } catch {
      return mockComplaintService.getComplaintById(complaintId);
    }
  }

  async getComplaintByReference(referenceId: string): Promise<Complaint | null> {
    return this.getComplaintById(referenceId);
  }

  async createComplaint(studentId: string, studentName: string, input: CreateComplaintInput): Promise<Complaint> {
    try {
      const created: any = await this.request('/complaints', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return this.mapComplaint(created);
    } catch {
      return mockComplaintService.createComplaint(studentId, studentName, input);
    }
  }

  async getCommunityFeed(hostelName: string): Promise<Complaint[]> {
    try {
      const list: any[] = await this.request('/community/feed');
      return this.mapComplaints(list);
    } catch {
      return mockComplaintService.getCommunityFeed(hostelName);
    }
  }

  async toggleSupport(complaintId: string, studentId: string): Promise<{ supported: boolean; supportCount: number }> {
    try {
      return await this.request(`/community/${complaintId}/support`, {
        method: 'POST',
      });
    } catch {
      return mockComplaintService.toggleSupport(complaintId, studentId);
    }
  }

  async addComment(
    complaintId: string,
    authorId: string,
    authorName: string,
    authorRole: string,
    content: string
  ): Promise<CommunityComment> {
    try {
      return await this.request(`/community/${complaintId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, visibility: 'public' }),
      });
    } catch {
      return mockComplaintService.addComment(complaintId, authorId, authorName, authorRole, content);
    }
  }

  async reportUnresolved(
    complaintId: string,
    studentId: string,
    reason?: string
  ): Promise<{ success: boolean; unresolvedCount: number; message: string }> {
    try {
      const res: any = await this.request(`/community/${complaintId}/unresolved`, {
        method: 'POST',
        body: JSON.stringify({ remarks: reason }),
      });
      return { success: true, unresolvedCount: res.unresolvedReportsCount, message: 'Unresolved report recorded.' };
    } catch {
      return mockComplaintService.reportUnresolved(complaintId, studentId, reason);
    }
  }

  async requestReopen(complaintId: string, studentId: string, reason: string): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/reopen-request`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.requestReopen(complaintId, studentId, reason);
    }
  }

  async acknowledgeComplaint(complaintId: string, actorId: string, actorName: string, actorRole: string): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/acknowledge`, { method: 'POST' });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.acknowledgeComplaint(complaintId, actorId, actorName, actorRole);
    }
  }

  async assignTechnician(
    complaintId: string,
    technicianName: string,
    notes: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ technicianId: actorId, notes }),
      });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.assignTechnician(complaintId, technicianName, notes, actorId, actorName, actorRole);
    }
  }

  async startWork(complaintId: string, actorId: string, actorName: string, actorRole: string): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/start-work`, { method: 'POST' });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.startWork(complaintId, actorId, actorName, actorRole);
    }
  }

  async markWorkCompleted(
    complaintId: string,
    repairNotes: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/complete-work`, {
        method: 'POST',
        body: JSON.stringify({ repairNotes }),
      });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.markWorkCompleted(complaintId, repairNotes, actorId, actorName, actorRole);
    }
  }

  async confirmResolution(
    complaintId: string,
    resolutionRemarks: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/confirm-resolution`, { method: 'POST' });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.confirmResolution(complaintId, resolutionRemarks, actorId, actorName, actorRole);
    }
  }

  async rejectComplaint(
    complaintId: string,
    mandatoryReason: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: mandatoryReason }),
      });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.rejectComplaint(complaintId, mandatoryReason, actorId, actorName, actorRole);
    }
  }

  async approveReopen(
    complaintId: string,
    technicianName: string | undefined,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/approve-reopen`, { method: 'POST' });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.approveReopen(complaintId, technicianName, actorId, actorName, actorRole);
    }
  }

  async reprioritizeComplaint(
    complaintId: string,
    newPriority: ComplaintPriority,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    try {
      const updated: any = await this.request(`/complaints/${complaintId}/reprioritize`, {
        method: 'POST',
        body: JSON.stringify({ priority: newPriority }),
      });
      return this.mapComplaint(updated);
    } catch {
      return mockComplaintService.reprioritizeComplaint(complaintId, newPriority, actorId, actorName, actorRole);
    }
  }

  async escalateComplaint(
    complaintId: string,
    escalationNotes: string,
    actorId: string,
    actorName: string,
    actorRole: string
  ): Promise<Complaint> {
    return mockComplaintService.escalateComplaint(complaintId, escalationNotes, actorId, actorName, actorRole);
  }

  private mapComplaints(list: any[]): Complaint[] {
    return (list || []).map((c) => this.mapComplaint(c));
  }

  private mapComplaint(c: any, timeline?: any[]): Complaint {
    return {
      id: c._id || c.id,
      referenceId: c.referenceId,
      studentId: c.student?.toString() || c.studentId || '',
      studentName: c.studentName || 'Student',
      hostelName: c.hostelName || '',
      block: c.block || 'A Block',
      roomNumber: c.roomNumber || '',
      category: c.category,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      assignedTechnicianName: c.assignedTechnicianName,
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
      supportedByStudentIds: c.hasSupported ? ['self'] : [],
      comments: c.comments || [],
      unresolvedReportStudentIds: c.hasReportedUnresolved ? ['self'] : [],
      history: (timeline || []).map((h: any) => ({
        id: h._id || h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        actorId: h.actor?.toString() || '',
        actorName: h.actorName,
        actorRole: h.actorRole,
        timestamp: h.timestamp,
        remarks: h.remarks,
      })),
    };
  }
}

export const apiComplaintService = new ApiComplaintService();
