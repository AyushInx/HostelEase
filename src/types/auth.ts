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

export interface IAuthService {
  loginStudent(credentials: AuthCredentials): Promise<AuthResult>;
  loginStaff(credentials: AuthCredentials): Promise<AuthResult>;
  getCurrentUser(): Promise<AuthUser | null>;
  logout(): Promise<void>;
}
