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
  'alex.sharma@iitp.ac.in': {
    id: 'usr_mock_std_001',
    name: 'Alex Sharma',
    email: 'alex.sharma@iitp.ac.in',
    role: 'Student',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Kalam Hostel',
    roomNumber: 'B-304',
    createdAt: '2026-01-15T10:00:00Z',
    mockPasswordHash: 'mock-student-pass',
  },
  // Demo Student with Approved Eligibility (Girls' Hostel)
  'priya.patel@iitp.ac.in': {
    id: 'usr_mock_std_002',
    name: 'Priya Patel',
    email: 'priya.patel@iitp.ac.in',
    role: 'Student',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Asima Hostel',
    roomNumber: 'G-102',
    createdAt: '2026-02-01T10:00:00Z',
    mockPasswordHash: 'mock-student-pass',
  },
  // Resident Student Ayush
  'ayush_2401ec60@iitp.ac.in': {
    id: 'usr_mock_std_ayush',
    name: 'Ayush',
    email: 'ayush_2401ec60@iitp.ac.in',
    role: 'Student',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Kalam Hostel',
    roomNumber: 'A-201',
    createdAt: '2026-02-10T10:00:00Z',
    mockPasswordHash: 'mock-student-pass',
  },
  // Demo Caretaker (Kalam Hostel)
  'caretaker.kalam@iitp.ac.in': {
    id: 'usr_mock_ct_001',
    name: 'Suresh Kumar',
    email: 'caretaker.kalam@iitp.ac.in',
    role: 'Caretaker',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Kalam Hostel',
    createdAt: '2025-11-01T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Caretaker (Asima Hostel - Girls' Hostel)
  'caretaker.asima@iitp.ac.in': {
    id: 'usr_mock_ct_002',
    name: 'Sunita Devi',
    email: 'caretaker.asima@iitp.ac.in',
    role: 'Caretaker',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Asima Hostel',
    createdAt: '2025-11-01T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Technician
  'tech.raj@iitp.ac.in': {
    id: 'usr_mock_tech_001',
    name: 'Rajesh Verma (Electrician)',
    email: 'tech.raj@iitp.ac.in',
    role: 'Technician',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Campus Maintenance Wing',
    createdAt: '2025-11-10T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Warden (Kalam Hostel)
  'warden.kalam@iitp.ac.in': {
    id: 'usr_mock_wd_001',
    name: 'Dr. Anita Roy',
    email: 'warden.kalam@iitp.ac.in',
    role: 'Warden',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Kalam Hostel',
    createdAt: '2025-10-01T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Warden (Asima Hostel - Girls' Hostel)
  'warden.asima@iitp.ac.in': {
    id: 'usr_mock_wd_002',
    name: 'Prof. V. Raman',
    email: 'warden.asima@iitp.ac.in',
    role: 'Warden',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    hostelName: 'Asima Hostel',
    createdAt: '2025-10-01T10:00:00Z',
    mockPasswordHash: 'mock-staff-pass',
  },
  // Demo Hostel Admin (System Admin)
  'admin@iitp.ac.in': {
    id: 'usr_mock_adm_001',
    name: 'Campus Chief Admin',
    email: 'admin@iitp.ac.in',
    role: 'Hostel Admin',
    isEmailVerified: true,
    eligibilityStatus: 'approved',
    createdAt: '2025-08-01T10:00:00Z',
    mockPasswordHash: 'mock-admin-pass',
  },
};

const CURRENT_USER_SESSION_KEY = 'hct_mock_active_session';

class MockAuthService implements IAuthService {
  private pendingOtps = new Map<string, string>();

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
        message: 'Invalid student credentials. For demo, use: alex.sharma@iitp.ac.in',
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

  async sendStudentOtp(email: string): Promise<{ success: boolean; message?: string }> {
    await this.simulateDelay(300);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@iitp.ac.in')) {
      return {
        success: false,
        message: 'Registration is restricted to @iitp.ac.in institutional college email.',
      };
    }

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingOtps.set(cleanEmail, randomOtp);

    return {
      success: true,
      message: 'OTP has been dispatched to your institutional inbox.',
    };
  }

  async registerStudent(data: {
    name: string;
    email: string;
    password: string;
    hostelName?: string;
    roomNumber?: string;
    otp: string;
  }): Promise<AuthResult> {
    await this.simulateDelay(400);
    const cleanEmail = data.email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@iitp.ac.in')) {
      return {
        success: false,
        message: 'Registration requires an @iitp.ac.in institutional email address.',
      };
    }

    const expectedOtp = this.pendingOtps.get(cleanEmail);
    if (!data.otp || !expectedOtp || data.otp.trim() !== expectedOtp) {
      return {
        success: false,
        message: 'Invalid verification code. Please check your inbox and try again.',
      };
    }

    this.pendingOtps.delete(cleanEmail);

    if (!data.password || data.password.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters.',
      };
    }

    const newUser: AuthUser & { mockPasswordHash: string } = {
      id: `usr_std_${Date.now()}`,
      name: data.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'Student',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
      hostelName: data.hostelName || 'Kalam Hostel',
      roomNumber: data.roomNumber || '101',
      createdAt: new Date().toISOString(),
      mockPasswordHash: data.password,
    };

    MOCK_USERS[cleanEmail] = newUser;
    try {
      const stored = localStorage.getItem('hct_custom_registered_users');
      const usersMap = stored ? JSON.parse(stored) : {};
      usersMap[cleanEmail] = newUser;
      localStorage.setItem('hct_custom_registered_users', JSON.stringify(usersMap));
    } catch {}

    const { mockPasswordHash: _, ...safeUser } = newUser;
    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(safeUser));

    return {
      success: true,
      user: safeUser,
      message: 'Student account registered and verified successfully!',
    };
  }

  async verifyDemoAccess(password: string): Promise<{ success: boolean; message?: string; error?: string }> {
    await this.simulateDelay(150);
    if (password.trim() === '280723') {
      return { success: true, message: 'Demo access granted' };
    }
    return { success: false, error: 'Incorrect password. Please try again.' };
  }
}

// Export singleton instance conforming to IAuthService
export const authService: IAuthService = new MockAuthService();
export const IS_MOCK_AUTH = true;
