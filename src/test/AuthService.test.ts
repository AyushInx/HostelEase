import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/mockAuthService';

describe('mockAuthService', () => {
  beforeEach(async () => {
    await authService.logout();
  });

  it('authenticates valid student credentials', async () => {
    const result = await authService.loginStudent({
      email: 'alex.sharma@iitp.ac.in',
      password: 'mock-student-pass',
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.role).toBe('Student');
    expect(result.user?.eligibilityStatus).toBe('approved');
  });

  it('rejects student with invalid password', async () => {
    const result = await authService.loginStudent({
      email: 'alex.sharma@iitp.ac.in',
      password: 'wrong-password',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Incorrect password');
  });

  it('rejects staff email in student login', async () => {
    const result = await authService.loginStudent({
      email: 'caretaker.kalam@iitp.ac.in',
      password: 'mock-staff-pass',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('belongs to staff');
  });

  it('authenticates staff across roles without any client role selector', async () => {
    // Caretaker
    const caretakerRes = await authService.loginStaff({
      email: 'caretaker.kalam@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    expect(caretakerRes.success).toBe(true);
    expect(caretakerRes.user?.role).toBe('Caretaker');

    // Technician
    const techRes = await authService.loginStaff({
      email: 'tech.raj@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    expect(techRes.success).toBe(true);
    expect(techRes.user?.role).toBe('Technician');

    // Warden
    const wardenRes = await authService.loginStaff({
      email: 'warden.kalam@iitp.ac.in',
      password: 'mock-staff-pass',
    });
    expect(wardenRes.success).toBe(true);
    expect(wardenRes.user?.role).toBe('Warden');

    // Hostel Admin
    const adminRes = await authService.loginStaff({
      email: 'admin@iitp.ac.in',
      password: 'mock-admin-pass',
    });
    expect(adminRes.success).toBe(true);
    expect(adminRes.user?.role).toBe('Hostel Admin');
  });

  it('handles session persistence and logout cleanly', async () => {
    await authService.loginStudent({
      email: 'alex.sharma@iitp.ac.in',
      password: 'mock-student-pass',
    });

    const activeUser = await authService.getCurrentUser();
    expect(activeUser).not.toBeNull();
    expect(activeUser?.email).toBe('alex.sharma@iitp.ac.in');

    await authService.logout();
    const loggedOutUser = await authService.getCurrentUser();
    expect(loggedOutUser).toBeNull();
  });
});
