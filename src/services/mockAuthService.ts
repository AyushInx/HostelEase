import type { AuthCredentials, AuthResult, AuthUser, IAuthService } from '../types/auth';

/**
 * =========================================================================
 * MOCK AUTHENTICATION SERVICE (PHASE 1 PROTOTYPE)
 * =========================================================================
 * WARNING: This is a clearly labeled mock service used solely for initial
 * UI scaffolding, form verification, and navigation flow testing.
 * 
 * - NO real credentials or sensitive secrets are stored here.
 * - This service strictly implements the IAuthService contract.
 * - In Phase 3, this will be swapped for real backend API calls with
 *   httpOnly, secure, sameSite cookie sessions without altering consumer UI.
 * =========================================================================
 */

export const MOCK_USERS: Record<string, AuthUser & { mockPasswordHash: string }> = {
  // Demo Student
  'alex.sharma@college.edu': {
    id: 'usr_mock_std_001',
    name: 'Alex Sharma',
    email: 'alex.sharma@college.edu',
    role: 'Student',
    eligibilityStatus: 'approved',
    hostelName: 'Mandakini Hostel',
    roomNumber: 'B-304',
    createdAt: '2026-01-15T10:00:00Z',
    mockPasswordHash: 'mock-student-pass',
  },
  // Demo Student with Pending Eligibility
  'priya.patel@college.edu': {
    id: 'usr_mock_std_002',
    name: 'Priya Patel',
    email: 'priya.patel@college.edu',
    role: 'Student',
    eligibilityStatus: 'pending',
    hostelName: 'Kaveri Hostel',
    roomNumber: 'A-102',
    createdAt: '2026-02-01T10:00:00Z',
    mockPasswordHash: 'mock-student-pass',
  },
  // Demo Caretaker
  'caretaker.mandakini@hostel.edu': {
    id: 'usr_mock_ct_001',
    name: 'Suresh Kumar',
    email: 'caretaker.mandakini@hostel.edu',
    role: 'Caretaker',
    eligibilityStatus: 'approved',
    hostelName: 'Mandakini Hostel',
    createdAt: '2025-11-01T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Technician
  'tech.raj@hostel.edu': {
    id: 'usr_mock_tech_001',
    name: 'Rajesh Verma (Electrician)',
    email: 'tech.raj@hostel.edu',
    role: 'Technician',
    eligibilityStatus: 'approved',
    hostelName: 'Campus Maintenance Wing',
    createdAt: '2025-11-10T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Warden
  'warden.mandakini@hostel.edu': {
    id: 'usr_mock_wd_001',
    name: 'Dr. Anita Roy',
    email: 'warden.mandakini@hostel.edu',
    role: 'Warden',
    eligibilityStatus: 'approved',
    hostelName: 'Mandakini Hostel',
    createdAt: '2025-10-01T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Hostel Admin (System Admin)
  'admin@campus.edu': {
    id: 'usr_mock_adm_001',
    name: 'Campus Chief Admin',
    email: 'admin@campus.edu',
    role: 'Hostel Admin',
    eligibilityStatus: 'approved',
    createdAt: '2025-08-01T10:00:00Z',
    mockPasswordHash: 'mock-admin-pass',
  },
};

const CURRENT_USER_SESSION_KEY = 'hct_mock_active_session';

class MockAuthService implements IAuthService {
  private simulateDelay(ms: number = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async loginStudent(credentials: AuthCredentials): Promise<AuthResult> {
    await this.simulateDelay();

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const userRecord = MOCK_USERS[normalizedEmail];

    if (!userRecord) {
      return {
        success: false,
        message: 'Invalid student credentials. For demo, use: alex.sharma@college.edu',
      };
    }

    if (userRecord.role !== 'Student') {
      return {
        success: false,
        message: 'This account belongs to staff. Please use the Staff Login portal.',
      };
    }

    if (credentials.password !== userRecord.mockPasswordHash) {
      return {
        success: false,
        message: 'Incorrect password. Demo password is: mock-student-pass',
      };
    }

    const { mockPasswordHash: _, ...safeUser } = userRecord;
    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(safeUser));

    return {
      success: true,
      user: safeUser,
      message: 'Student authenticated successfully (MOCK).',
    };
  }

  async loginStaff(credentials: AuthCredentials): Promise<AuthResult> {
    await this.simulateDelay();

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const userRecord = MOCK_USERS[normalizedEmail];

    if (!userRecord) {
      return {
        success: false,
        message: 'Staff account not found. Staff accounts must be provisioned by a Hostel Admin.',
      };
    }

    if (userRecord.role === 'Student') {
      return {
        success: false,
        message: 'Student account detected. Please use the Student Login portal.',
      };
    }

    if (credentials.password !== userRecord.mockPasswordHash) {
      return {
        success: false,
        message: 'Incorrect staff password. Check demo credentials.',
      };
    }

    const { mockPasswordHash: _, ...safeUser } = userRecord;
    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(safeUser));

    return {
      success: true,
      user: safeUser,
      message: `Authenticated as ${safeUser.role} (MOCK).`,
    };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    await this.simulateDelay(100);
    try {
      const data = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.simulateDelay(100);
    sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
  }
}

// Export singleton instance conforming to IAuthService
export const authService: IAuthService = new MockAuthService();
export const IS_MOCK_AUTH = true;
