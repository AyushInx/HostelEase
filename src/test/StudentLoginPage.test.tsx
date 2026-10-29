import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StudentLoginPage } from '../pages/StudentLoginPage';
import { AuthProvider } from '../context/AuthContext';

describe('StudentLoginPage', () => {
  const renderStudentLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <StudentLoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders student login form with email, password, and register link', () => {
    renderStudentLoginPage();
    expect(screen.getByRole('heading', { name: /Student Portal Login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/College Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In as Student/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register here/i })).toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    const user = userEvent.setup();
    renderStudentLoginPage();

    const submitBtn = screen.getByRole('button', { name: /Sign In as Student/i });
    await user.click(submitBtn);

    expect(screen.getByText(/College email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it('validates invalid email format and non-@iitp.ac.in domains', async () => {
    const user = userEvent.setup();
    renderStudentLoginPage();

    const emailInput = screen.getByLabelText(/College Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Sign In as Student/i });

    // Invalid format
    await user.type(emailInput, 'not-an-email');
    await user.type(passwordInput, 'validpass123');
    await user.click(submitBtn);
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();

    // Valid email syntax but non-@iitp.ac.in
    await user.clear(emailInput);
    await user.type(emailInput, 'student@gmail.com');
    await user.click(submitBtn);
    expect(screen.getByText(/must end with @iitp\.ac\.in/i)).toBeInTheDocument();
  });

  it('validates minimum password length', async () => {
    const user = userEvent.setup();
    renderStudentLoginPage();

    const emailInput = screen.getByLabelText(/College Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Sign In as Student/i });

    await user.type(emailInput, 'student@iitp.ac.in');
    await user.type(passwordInput, '123');
    await user.click(submitBtn);

    expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
  });

  it('auto-fills demo student credentials', async () => {
    const user = userEvent.setup();
    renderStudentLoginPage();

    const autoFillBtn = screen.getByRole('button', { name: /Auto-fill Demo Student Credentials/i });
    await user.click(autoFillBtn);

    const emailInput = screen.getByLabelText(/College Email Address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' }) as HTMLInputElement;

    expect(emailInput.value).toBe('alex.sharma@iitp.ac.in');
    expect(passwordInput.value).toBe('mock-student-pass');
  });

  it('shows error on invalid student credentials', async () => {
    const user = userEvent.setup();
    renderStudentLoginPage();

    const emailInput = screen.getByLabelText(/College Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i, { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Sign In as Student/i });

    await user.type(emailInput, 'unknown.student@iitp.ac.in');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid student credentials/i)).toBeInTheDocument();
    });
  });
});
