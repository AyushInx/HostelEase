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
    expect(screen.getByRole('heading', { name: /Every issue deserves a resolution/i })).toBeInTheDocument();
    expect(screen.getByText(/Report complaints, track progress/i)).toBeInTheDocument();
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

  it('does not display mock credentials on the landing page', () => {
    renderLandingPage();
    expect(screen.queryByText(/Phase 1 Mock Evaluation Credentials/i)).not.toBeInTheDocument();
  });
});
