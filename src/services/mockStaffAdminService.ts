import type { UserRole } from '../types/auth';

export interface HostelBlock {
  id: string;
  name: string;
  floors: number;
  roomsCount: number;
}

export interface HostelRecord {
  id: string;
  name: string;
  code: string;
  caretakerName: string;
  wardenName: string;
  blocks: HostelBlock[];
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hostelName?: string;
  specialization?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | string;
  action: string;
  targetEntity: 'Complaint' | 'Staff' | 'Hostel' | 'SLA';
  entityId: string;
  details: string;
  timestamp: string;
}

const STORAGE_HOSTELS_KEY = 'hct_mock_hostels_v3';
const STORAGE_STAFF_KEY = 'hct_mock_staff_v2';
const STORAGE_AUDIT_KEY = 'hct_mock_audit_v2';

const INITIAL_HOSTELS: HostelRecord[] = [
  {
    id: 'hst_001',
    name: 'Kalam Hostel',
    code: 'KLM',
    caretakerName: 'Suresh Kumar',
    wardenName: 'Dr. Anita Roy',
    blocks: [
      { id: 'blk_001', name: 'A Block', floors: 8, roomsCount: 296 },
      { id: 'blk_002', name: 'B Block', floors: 8, roomsCount: 208 },
      { id: 'blk_003', name: 'C Block', floors: 8, roomsCount: 208 },
      { id: 'blk_004', name: 'D Block', floors: 8, roomsCount: 296 },
    ],
  },
  {
    id: 'hst_002',
    name: 'Asima Hostel',
    code: 'ASM',
    caretakerName: 'Sunita Devi',
    wardenName: 'Prof. V. Raman',
    blocks: [
      { id: 'blk_005', name: 'East Wing', floors: 5, roomsCount: 150 },
      { id: 'blk_006', name: 'West Wing', floors: 5, roomsCount: 150 },
    ],
  },
  {
    id: 'hst_003',
    name: 'Aryabhatta Hostel',
    code: 'ABH',
    caretakerName: 'Rakesh Verma',
    wardenName: 'Dr. S. Mukherjee',
    blocks: [
      { id: 'blk_007', name: 'A Block', floors: 8, roomsCount: 256 },
      { id: 'blk_008', name: 'B Block', floors: 8, roomsCount: 256 },
      { id: 'blk_009', name: 'C Block', floors: 8, roomsCount: 256 },
      { id: 'blk_010', name: 'D Block', floors: 8, roomsCount: 256 },
    ],
  },
  {
    id: 'hst_004',
    name: 'C.V.R Hostel',
    code: 'CVR',
    caretakerName: 'Mahesh Babu',
    wardenName: 'Dr. K. Sharma',
    blocks: [
      { id: 'blk_011', name: 'A Block', floors: 8, roomsCount: 224 },
    ],
  },
];

const INITIAL_STAFF: StaffAccount[] = [
  {
    id: 'usr_mock_ct_001',
    name: 'Suresh Kumar',
    email: 'caretaker.kalam@iitp.ac.in',
    role: 'Caretaker',
    hostelName: 'Kalam Hostel',
    status: 'active',
    createdAt: '2025-11-01T10:00:00Z',
  },
  {
    id: 'usr_mock_ct_002',
    name: 'Sunita Devi',
    email: 'caretaker.asima@iitp.ac.in',
    role: 'Caretaker',
    hostelName: 'Asima Hostel',
    status: 'active',
    createdAt: '2025-11-01T10:00:00Z',
  },
  {
    id: 'usr_mock_tech_001',
    name: 'Rajesh Verma (Electrician)',
    email: 'tech.raj@iitp.ac.in',
    role: 'Technician',
    specialization: 'Electrical & Power Systems',
    status: 'active',
    createdAt: '2025-11-10T10:00:00Z',
  },
  {
    id: 'usr_mock_tech_002',
    name: 'Amit Singh (Plumber)',
    email: 'tech.amit@iitp.ac.in',
    role: 'Technician',
    specialization: 'Plumbing & Drainage',
    status: 'active',
    createdAt: '2025-11-12T10:00:00Z',
  },
  {
    id: 'usr_mock_tech_003',
    name: 'Dilip Rao (Carpenter)',
    email: 'tech.dilip@iitp.ac.in',
    role: 'Technician',
    specialization: 'Carpentry & Furniture',
    status: 'active',
    createdAt: '2025-11-15T10:00:00Z',
  },
  {
    id: 'usr_mock_wd_001',
    name: 'Dr. Anita Roy',
    email: 'warden.kalam@iitp.ac.in',
    role: 'Warden',
    hostelName: 'Kalam Hostel',
    status: 'active',
    createdAt: '2025-10-01T10:00:00Z',
  },
  {
    id: 'usr_mock_wd_002',
    name: 'Prof. V. Raman',
    email: 'warden.asima@iitp.ac.in',
    role: 'Warden',
    hostelName: 'Asima Hostel',
    status: 'active',
    createdAt: '2025-10-01T10:00:00Z',
  },
  {
    id: 'usr_mock_adm_001',
    name: 'Campus Chief Admin',
    email: 'admin@iitp.ac.in',
    role: 'Hostel Admin',
    status: 'active',
    createdAt: '2025-08-01T10:00:00Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'adt_001',
    actorId: 'usr_mock_adm_001',
    actorName: 'Campus Chief Admin',
    actorRole: 'Hostel Admin',
    action: 'SEED_SYSTEM',
    targetEntity: 'Hostel',
    entityId: 'SYSTEM',
    details: 'Initial system bootstrap via environment variables. Hostels C.V.R, Kalam, Asima configured.',
    timestamp: '2026-10-01T08:00:00Z',
  },
  {
    id: 'adt_002',
    actorId: 'usr_mock_adm_001',
    actorName: 'Campus Chief Admin',
    actorRole: 'Hostel Admin',
    action: 'PROVISION_STAFF',
    targetEntity: 'Staff',
    entityId: 'usr_mock_ct_001',
    details: 'Provisioned Caretaker Suresh Kumar for Kalam Hostel.',
    timestamp: '2026-10-05T09:30:00Z',
  },
  {
    id: 'adt_003',
    actorId: 'usr_mock_ct_001',
    actorName: 'Suresh Kumar',
    actorRole: 'Caretaker',
    action: 'TICKET_ACKNOWLEDGE',
    targetEntity: 'Complaint',
    entityId: 'HCT-2026-84912',
    details: 'Ticket status transitioned: Submitted -> Seen.',
    timestamp: '2026-10-23T09:15:00Z',
  },
  {
    id: 'adt_004',
    actorId: 'usr_mock_ct_001',
    actorName: 'Suresh Kumar',
    actorRole: 'Caretaker',
    action: 'ASSIGN_TECHNICIAN',
    targetEntity: 'Complaint',
    entityId: 'HCT-2026-84912',
    details: 'Assigned Rajesh Verma (Electrician). Status: Seen -> Assigned.',
    timestamp: '2026-10-23T11:00:00Z',
  },
  {
    id: 'adt_005',
    actorId: 'usr_mock_wd_001',
    actorName: 'Dr. Anita Roy',
    actorRole: 'Warden',
    action: 'CONFIRM_RESOLUTION',
    targetEntity: 'Complaint',
    entityId: 'HCT-2026-51204',
    details: 'Verified Wi-Fi router AP-04 resolution. Status: Work Completed -> Resolved.',
    timestamp: '2026-10-21T16:30:00Z',
  },
];

class MockStaffAdminService {
  private hostels: HostelRecord[] = [];
  private staff: StaffAccount[] = [];
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('hct_mock_hostels_v1');
        sessionStorage.removeItem('hct_mock_hostels_v2');
      }
      const h = sessionStorage.getItem(STORAGE_HOSTELS_KEY);
      const parsed = h ? JSON.parse(h) : null;
      // Auto-refresh cache if Aryabhatta is missing or CVR blocks need sync or old Mandakini present
      const needsRefresh = !parsed || !parsed.some((x: any) => x.name === 'Aryabhatta Hostel') || parsed.some((x: any) => /mandakini/i.test(x.name));
      
      this.hostels = needsRefresh ? JSON.parse(JSON.stringify(INITIAL_HOSTELS)) : parsed;
      if (needsRefresh) {
        sessionStorage.setItem(STORAGE_HOSTELS_KEY, JSON.stringify(this.hostels));
      }

      const s = sessionStorage.getItem(STORAGE_STAFF_KEY);
      this.staff = s ? JSON.parse(s) : JSON.parse(JSON.stringify(INITIAL_STAFF));

      const a = sessionStorage.getItem(STORAGE_AUDIT_KEY);
      this.auditLogs = a ? JSON.parse(a) : JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    } catch {
      this.hostels = JSON.parse(JSON.stringify(INITIAL_HOSTELS));
      this.staff = JSON.parse(JSON.stringify(INITIAL_STAFF));
      this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    }
  }

  private save() {
    try {
      sessionStorage.setItem(STORAGE_HOSTELS_KEY, JSON.stringify(this.hostels));
      sessionStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(this.staff));
      sessionStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(this.auditLogs));
    } catch {
      // Ignore in non-browser
    }
  }

  private delay(ms = 150): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getHostels(): Promise<HostelRecord[]> {
    await this.delay();
    this.load();
    return this.hostels;
  }

  async addHostelBlock(hostelId: string, blockName: string, floors: number, roomsCount: number): Promise<HostelRecord> {
    await this.delay();
    this.load();
    const h = this.hostels.find((item) => item.id === hostelId);
    if (!h) throw new Error('Hostel not found');

    const newBlock: HostelBlock = {
      id: `blk_${Date.now()}`,
      name: blockName.trim(),
      floors,
      roomsCount,
    };
    h.blocks.push(newBlock);
    this.appendAuditLog('Campus Chief Admin', 'Hostel Admin', 'ADD_HOSTEL_BLOCK', 'Hostel', h.name, `Added ${blockName} (${floors} floors, ${roomsCount} rooms)`);
    this.save();
    return h;
  }

  async getStaffAccounts(): Promise<StaffAccount[]> {
    await this.delay();
    this.load();
    return this.staff;
  }

  async getTechnicians(): Promise<StaffAccount[]> {
    await this.delay(50);
    this.load();
    return this.staff.filter((s) => s.role === 'Technician' && s.status === 'active');
  }

  async createStaffAccount(account: Omit<StaffAccount, 'id' | 'createdAt'>): Promise<StaffAccount> {
    await this.delay();
    this.load();

    const newAccount: StaffAccount = {
      ...account,
      id: `usr_staff_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    this.staff.push(newAccount);
    this.appendAuditLog(
      'Campus Chief Admin',
      'Hostel Admin',
      'PROVISION_STAFF',
      'Staff',
      newAccount.email,
      `Provisioned new ${newAccount.role} (${newAccount.name})`
    );
    this.save();
    return newAccount;
  }

  async toggleStaffStatus(staffId: string): Promise<StaffAccount> {
    await this.delay();
    this.load();
    const target = this.staff.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    target.status = target.status === 'active' ? 'suspended' : 'active';
    this.appendAuditLog(
      'Campus Chief Admin',
      'Hostel Admin',
      'UPDATE_STAFF_STATUS',
      'Staff',
      target.email,
      `Set status of ${target.name} to ${target.status}`
    );
    this.save();
    return target;
  }

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    await this.delay();
    this.load();
    return this.auditLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  appendAuditLog(
    actorName: string,
    actorRole: string,
    action: string,
    targetEntity: 'Complaint' | 'Staff' | 'Hostel' | 'SLA',
    entityId: string,
    details: string
  ): void {
    this.load();
    const log: AuditLogEntry = {
      id: `adt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorId: 'system_actor',
      actorName,
      actorRole,
      action,
      targetEntity,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(log);
    this.save();
  }
}

export const staffAdminService = new MockStaffAdminService();
