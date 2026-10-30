export type UserRole = 
  | 'Student'
  | 'Caretaker'
  | 'Technician'
  | 'Warden'
  | 'Hostel Admin';

export type EligibilityStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified?: boolean;
  eligibilityStatus: EligibilityStatus;
  hostelName?: string;
  roomNumber?: string;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  message?: string;
}

export interface RegisterStudentData {
  name: string;
  email: string;
  password: string;
  hostelName?: string;
  roomNumber?: string;
  otp: string;
}

export interface IAuthService {
  loginStudent(credentials: AuthCredentials): Promise<AuthResult>;
  loginStaff(credentials: AuthCredentials): Promise<AuthResult>;
  getCurrentUser(): Promise<AuthUser | null>;
  logout(): Promise<void>;
  sendStudentOtp?(email: string): Promise<{ success: boolean; message?: string; testOtp?: string }>;
  registerStudent?(data: RegisterStudentData): Promise<AuthResult>;
  verifyDemoAccess?(password: string): Promise<{ success: boolean; message?: string; error?: string }>;
}
