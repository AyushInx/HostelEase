import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StudentDashboardPage } from '../pages/StudentDashboardPage';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/mockAuthService';

describe('StudentDashboardPage (Phase 2)', () => {
  beforeEach(async () => {
    // Authenticate demo student Alex Sharma
    await authService.loginStudent({
      email: 'alex.sharma@iitp.ac.in',
      password: 'mock-student-pass',
    });
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <StudentDashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders student maintenance hub header and overview metric counters', async () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: /Student Maintenance Hub/i })).toBeInTheDocument();
    expect(screen.getByText(/Alex Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Kalam Hostel, Room B-304/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Total Tickets/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Submitted/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Resolved/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Reopened/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filters complaints by search query', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Ceiling Fan Making Loud Noise/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/Search complaints by ticket ID, title, or room/i);
    await user.type(searchInput, 'Ceiling Fan');

    await waitFor(() => {
      expect(screen.getByText(/Ceiling Fan Making Loud Noise/i)).toBeInTheDocument();
      expect(screen.queryByText(/Bathroom Tap Leaking Continuously/i)).not.toBeInTheDocument();
    });
  });

  it('opens New Complaint modal, validates input, and displays generated ticket reference ID upon creation', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const newComplaintBtn = screen.getByRole('button', { name: /New Complaint/i });
    await user.click(newComplaintBtn);

    expect(screen.getByRole('heading', { name: /Submit a Complaint/i })).toBeInTheDocument();

    // Submit empty to test validation
    const submitBtn = screen.getByRole('button', { name: /Generate Ticket/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please describe the maintenance issue/i)).toBeInTheDocument();

    // Fill valid data
    const titleInput = screen.getByLabelText(/Complaint Summary/i);
    const descInput = screen.getByLabelText(/Description/i);

    await user.type(titleInput, 'Study chair backrest broken');
    await user.type(descInput, 'The ergonomic adjustment screw broke off and backrest falls back.');

    await user.click(submitBtn);

    // Verify confirmation screen with reference ID
    await waitFor(() => {
      expect(screen.getByText(/Complaint Registered Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/Official Ticket Reference ID/i)).toBeInTheDocument();
      expect(screen.getByText(/HCT-2026-/i)).toBeInTheDocument();
    });
  }, 15000);

  it('opens ticket details modal and displays timeline audit milestones', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /View Details & Timeline/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    const viewButtons = screen.getAllByRole('button', { name: /View Details & Timeline/i });
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Lifecycle Milestone Audit Trail/i })).toBeInTheDocument();
      expect(screen.getByText(/Append-only audit trail verified/i)).toBeInTheDocument();
    });
  });

  it('switches to Hostel Community Board and displays community feed without student emails', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const communityTab = screen.getByRole('tab', { name: /(?:Kalam|C\.V\.R) Hostel Community Board/i });
    await user.click(communityTab);

    await waitFor(() => {
      expect(screen.getByText(/Community Maintenance Board/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ceiling Fan/i).length).toBeGreaterThan(0);
    });

    // Verify student email is never displayed in community feed
    expect(screen.queryByText(/priya\.patel@iitp\.ac\.in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/alex\.sharma@iitp\.ac\.in/i)).not.toBeInTheDocument();
  });
});
