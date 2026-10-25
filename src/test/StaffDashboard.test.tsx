import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StaffDashboardPage } from '../pages/StaffDashboardPage';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/mockAuthService';

describe('StaffDashboardPage (Phase 3 - 4 Staff Roles)', () => {
  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <StaffDashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(async () => {
    await authService.logout();
  });

  it('renders Caretaker view with Acknowledge, Assign, and Reject actions (no Confirm Resolution)', async () => {
    // 1. Authenticate Caretaker
    await authService.loginStaff({
      email: 'caretaker.mandakini@hostel.edu',
      password: 'mock-staff-pass',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Suresh Kumar/i)).toBeInTheDocument();
      expect(screen.getByText(/Caretaker Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Mandakini Hostel Jurisdiction/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      // Caretaker should see Acknowledge or Assign button
      const assignButtons = screen.getAllByRole('button', { name: /(Assign|Reassign)/i });
      expect(assignButtons.length).toBeGreaterThan(0);
    });

    // Verify unauthorized actions are NOT present
    expect(screen.queryByRole('button', { name: /Confirm Resolution/i })).not.toBeInTheDocument();
  });

  it('renders Technician view showing assigned orders and Start Work / Complete Work (no Reject)', async () => {
    // 2. Authenticate Technician Rajesh Verma
    await authService.loginStaff({
      email: 'tech.raj@hostel.edu',
      password: 'mock-staff-pass',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Rajesh Verma/i)).toBeInTheDocument();
      expect(screen.getByText(/Technician Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/My Assigned Work Orders/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      // Technician should see Complete Work or Start Work
      const techButtons = screen.getAllByRole('button', { name: /(Complete Work|Start Work)/i });
      expect(techButtons.length).toBeGreaterThan(0);
    });

    // SPEC INVARIANT: Technicians CANNOT reject complaints
    expect(screen.queryByRole('button', { name: /^Reject$/i })).not.toBeInTheDocument();
    // Technicians CANNOT confirm final resolution
    expect(screen.queryByRole('button', { name: /Confirm Resolution/i })).not.toBeInTheDocument();
  });

  it('renders Warden view with Confirm Resolution, Reprioritize, and Reject actions', async () => {
    // 3. Authenticate Warden Dr. Anita Roy
    await authService.loginStaff({
      email: 'warden.mandakini@hostel.edu',
      password: 'mock-staff-pass',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Dr. Anita Roy/i)).toBeInTheDocument();
      expect(screen.getByText(/Warden Portal/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      // Reprioritize priority selector is visible to Warden
      const prioritySelects = screen.getAllByLabelText(/Change priority for/i);
      expect(prioritySelects.length).toBeGreaterThan(0);

      // Warden can reject complaints
      const rejectButtons = screen.getAllByRole('button', { name: /^Reject$/i });
      expect(rejectButtons.length).toBeGreaterThan(0);
    });

    // Wardens do NOT assign duty technicians
    expect(screen.queryByRole('button', { name: /(Assign|Reassign)/i })).not.toBeInTheDocument();
  });

  it('renders Hostel Admin view with cross-hostel tabs, staff management, and audit logs', async () => {
    // 4. Authenticate Hostel Admin
    await authService.loginStaff({
      email: 'admin@campus.edu',
      password: 'mock-admin-pass',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Campus Chief Admin/i)).toBeInTheDocument();
      expect(screen.getByText(/Hostel Admin Portal/i)).toBeInTheDocument();
    });

    // Verify Admin tabs
    expect(screen.getByRole('button', { name: /Cross-Hostel Complaints/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hostels & Blocks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Staff Accounts & Roles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Immutable Audit Logs/i })).toBeInTheDocument();

    // Switch to Hostels & Blocks tab
    const hostelsTab = screen.getByRole('button', { name: /Hostels & Blocks/i });
    fireEvent.click(hostelsTab);
    await waitFor(() => {
      expect(screen.getByText(/Hostel & Block Management/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Mandakini Hostel/i).length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Staff Accounts tab
    const staffTab = screen.getByRole('button', { name: /Staff Accounts & Roles/i });
    fireEvent.click(staffTab);
    await waitFor(() => {
      expect(screen.getByText(/Staff Accounts & Role Assignments/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Provision Staff Account/i })).toBeInTheDocument();
    });

    // Switch to Audit Logs tab
    const auditTab = screen.getByRole('button', { name: /Immutable Audit Logs/i });
    fireEvent.click(auditTab);
    await waitFor(() => {
      expect(screen.getByText(/System Audit Trail/i)).toBeInTheDocument();
      expect(screen.getByText(/Append-only, immutable record/i)).toBeInTheDocument();
    });
  });
});
