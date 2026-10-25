import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { AuthProvider } from '../context/AuthContext';

describe('LandingPage', () => {
  const renderLandingPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LandingPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders the application title and pitch', () => {
    renderLandingPage();
    expect(screen.getByRole('heading', { name: /Hostel Complaint Tracker/i })).toBeInTheDocument();
    expect(screen.getByText(/Complaints are currently scattered across WhatsApp/i)).toBeInTheDocument();
  });

  it('renders both Student and Staff entry portals', () => {
    renderLandingPage();
    expect(screen.getByRole('heading', { name: /Student Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Staff Operations/i })).toBeInTheDocument();

    const studentLoginBtn = screen.getByRole('button', { name: /Student Login/i });
    const staffLoginBtn = screen.getByRole('button', { name: /Staff Login/i });

    expect(studentLoginBtn).toBeInTheDocument();
    expect(staffLoginBtn).toBeInTheDocument();
  });

  it('provides a student registration link for new residents', () => {
    renderLandingPage();
    const registerLink = screen.getByRole('link', { name: /Register with College Email/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/login/student?mode=register');
  });

  it('prominently displays the Phase 1 mock evaluation credentials guide', () => {
    renderLandingPage();
    expect(screen.getByText(/Phase 1 Mock Evaluation Credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/alex.sharma@college.edu/i)).toBeInTheDocument();
    expect(screen.getByText(/admin@campus.edu/i)).toBeInTheDocument();
  });
});
