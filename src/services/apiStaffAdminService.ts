/**
 * API-backed Staff Admin Service
 * Wraps backend /api/staff/* endpoints and falls back to mockStaffAdminService
 * on genuine network errors (backend unreachable).
 */
import type { HostelRecord, StaffAccount, AuditLogEntry } from './mockStaffAdminService';
import { staffAdminService as mockStaffAdminService } from './mockStaffAdminService';

const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isNetworkError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    msg.includes('failed to fetch') ||
    err?.name === 'TypeError'
  );
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  const csrf = getCsrfToken();
  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['x-xsrf-token'] = csrf;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

class ApiStaffAdminService {
  async getHostels(): Promise<HostelRecord[]> {
    try {
      const raw: any[] = await apiRequest('/staff/hostels');
      return (raw || []).map((h: any) => ({
        id: h._id || h.id,
        name: h.name,
        code: h.code,
        caretakerName: h.caretakerName || '',
        wardenName: h.wardenName || '',
        blocks: (h.blocks || []).map((b: any) => ({
          id: b._id || b.id || b.name,
          name: b.name,
          floors: b.floors,
          roomsCount: b.roomsCount,
        })),
      }));
    } catch (err) {
      if (isNetworkError(err)) {
        return mockStaffAdminService.getHostels();
      }
      // Non-network error (e.g. 403 for insufficient role) — return empty rather than mock data
      return [];
    }
  }

  async getTechnicians(): Promise<StaffAccount[]> {
    try {
      const raw: any[] = await apiRequest('/staff/accounts');
      const technicians = (raw || []).filter((u: any) => u.role === 'Technician');
      return technicians.map((u: any) => ({
        id: u._id || u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        hostelName: u.hostelName,
        specialization: u.specialization,
        status: u.status || 'active',
        createdAt: u.createdAt || new Date().toISOString(),
      }));
    } catch (err) {
      if (isNetworkError(err)) {
        return mockStaffAdminService.getTechnicians();
      }
      return [];
    }
  }

  async getStaff(): Promise<StaffAccount[]> {
    try {
      const raw: any[] = await apiRequest('/staff/accounts');
      return (raw || []).map((u: any) => ({
        id: u._id || u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        hostelName: u.hostelName,
        specialization: u.specialization,
        status: u.status || 'active',
        createdAt: u.createdAt || new Date().toISOString(),
      }));
    } catch (err) {
      if (isNetworkError(err)) {
        return mockStaffAdminService.getStaffAccounts();
      }
      return [];
    }
  }

  /** Alias kept for backward compat */
  async getStaffAccounts(): Promise<StaffAccount[]> {
    return this.getStaff();
  }

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const raw: any[] = await apiRequest('/audit');
      return (raw || []).map((entry: any) => ({
        id: entry._id || entry.id,
        actorId: entry.actorId || '',
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        action: entry.action,
        targetEntity: entry.targetEntity,
        entityId: entry.entityId,
        details: entry.details,
        timestamp: entry.timestamp,
      }));
    } catch (err) {
      if (isNetworkError(err)) {
        return mockStaffAdminService.getAuditLogs?.() ?? [];
      }
      return [];
    }
  }
}

export const apiStaffAdminService = new ApiStaffAdminService();
// Alias for drop-in replacement of mockStaffAdminService
export const staffAdminService = apiStaffAdminService;
