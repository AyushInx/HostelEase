import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { StaffLoginPage } from '../pages/StaffLoginPage';
import { AuthProvider } from '../context/AuthContext';

describe('StaffLoginPage', () => {
  const renderStaffLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <StaffLoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders staff login form with email and password', () => {
    renderStaffLoginPage();
    expect(screen.getByRole('heading', { name: /Staff & Operations Portal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Staff Institutional Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Authenticate Staff/i })).toBeInTheDocument();
  });

  it('strictly enforces NO role picker and NO public signup', () => {
    renderStaffLoginPage();

    // Verify there is NO select or dropdown for picking roles
    const selectElements = screen.queryAllByRole('combobox');
    expect(selectElements.length).toBe(0);

    // Verify explicit disclaimer that roles are resolved server-side
    expect(screen.getByText(/Strict Role Invariants Enforced/i)).toBeInTheDocument();
    expect(screen.getByText(/resolved server-side/i)).toBeInTheDocument();
    expect(screen.getByText(/no client-side role picker/i)).toBeInTheDocument();

    // Verify explicit statement that staff cannot self-register
    expect(screen.getByText(/Staff accounts cannot be registered publicly/i)).toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    const user = userEvent.setup();
    renderStaffLoginPage();

    const submitBtn = screen.getByRole('button', { name: /Authenticate Staff/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Staff email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it('populates fields via quick test staff profile buttons', async () => {
    const user = userEvent.setup();
    renderStaffLoginPage();

    const caretakerBtn = screen.getByRole('button', { name: /Caretaker/i });
    await user.click(caretakerBtn);

    const emailInput = screen.getByLabelText(/Staff Institutional Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' }) as HTMLInputElement;

    expect(emailInput.value).toBe('caretaker.kalam@iitp.ac.in');
    expect(passwordInput.value).toBe('mock-staff-pass');
  });

  it('displays error if a student tries to authenticate via staff portal', async () => {
    const user = userEvent.setup();
    renderStaffLoginPage();

    const emailInput = screen.getByLabelText(/Staff Institutional Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Authenticate Staff/i });

    await user.type(emailInput, 'alex.sharma@iitp.ac.in');
    await user.type(passwordInput, 'mock-student-pass');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Student account detected\. Please use the Student Login portal\./i)).toBeInTheDocument();
    });
  });
});
