import type { AuthCredentials, AuthResult, AuthUser, IAuthService, RegisterStudentData } from '../types/auth';
import { authService as mockAuthService } from './mockAuthService';

const API_BASE_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isNetworkError(err: any): boolean {
  if (import.meta.env.PROD) return false;
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('failed to parse url') ||
    msg.includes('invalid url') ||
    err?.name === 'TypeError'
  );
}

export class ApiAuthService implements IAuthService {
  private async ensureCsrfToken(): Promise<string | null> {
    const existing = getCsrfToken();
    if (existing) return existing;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        return json?.data?.csrfToken || getCsrfToken();
      }
    } catch {
      // Ignore in mock environment
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrf = (await this.ensureCsrfToken()) || getCsrfToken();
      if (csrf) {
        headers['x-xsrf-token'] = csrf;
      }
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // sends and receives signed httpOnly session cookies
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  }

  async sendStudentOtp(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      return {
        success: true,
        message: 'A 6-digit verification code has been dispatched to your institutional inbox.',
      };
    } catch (err: any) {
      if (isNetworkError(err)) {
        console.warn('[ApiAuthService] Backend unreachable, falling back to mock');
        if (mockAuthService.sendStudentOtp) {
          return mockAuthService.sendStudentOtp(email);
        }
      }
      return {
        success: false,
        message: err.message || 'Failed to dispatch verification code. Please try again.',
      };
    }
  }

  async registerStudent(data: RegisterStudentData): Promise<AuthResult> {
    try {
      const result = await this.request<{ user: AuthUser; token: string }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email.toLowerCase().trim(),
          otp: data.otp.trim(),
          name: data.name.trim(),
        }),
      });

      return {
        success: true,
        user: result.user,
        message: 'Student account verified and created successfully.',
      };
    } catch (err: any) {
      if (isNetworkError(err)) {
        console.warn('[ApiAuthService] Backend unreachable, falling back to mock');
        if (mockAuthService.registerStudent) {
          return mockAuthService.registerStudent(data);
        }
      }
      return {
        success: false,
        message: err.message || 'Verification failed. Please check your code and try again.',
      };
    }
  }

  async loginStudent(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const result = await this.request<{ user: AuthUser; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password,
        }),
      });

      if (result.user.role !== 'Student') {
        return {
          success: false,
          message: 'Staff account detected. Please use the Staff Portal to log in.',
        };
      }

      return {
        success: true,
        user: result.user,
      };
    } catch (err: any) {
      if (isNetworkError(err)) {
        console.warn('[ApiAuthService] Backend unreachable, delegating login to mockAuthService');
        return mockAuthService.loginStudent(credentials);
      }
      return {
        success: false,
        message: err.message || 'Login failed. Please verify credentials.',
      };
    }
  }

  async loginStaff(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const result = await this.request<{ user: AuthUser; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password,
        }),
      });

      if (result.user.role === 'Student') {
        return {
          success: false,
          message: 'Student account detected. Please use the Student Login portal.',
        };
      }

      return {
        success: true,
        user: result.user,
      };
    } catch (err: any) {
      if (isNetworkError(err)) {
        console.warn('[ApiAuthService] Backend unreachable, delegating login to mockAuthService');
        return mockAuthService.loginStaff(credentials);
      }
      return {
        success: false,
        message: err.message || 'Invalid staff credentials.',
      };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const result = await this.request<{ user: AuthUser }>('/auth/me');
      return result.user || null;
    } catch (err: any) {
      // Only fall back to mock session if backend is genuinely unreachable (network error).
      // A 401 from an available backend means "no session" — return null, do not restore mock.
      if (isNetworkError(err)) {
        return mockAuthService.getCurrentUser();
      }
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors; session cookie will expire naturally
    }
    // Always clear the mock session too (safety net for dev/test fallback sessions)
    await mockAuthService.logout();
  }
}

export const apiAuthService = new ApiAuthService();
