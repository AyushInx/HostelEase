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

  it('strictly enforces NO role picker and NO public signup link', () => {
    renderStaffLoginPage();

    // Verify there is NO select or dropdown for picking roles
    const selectElements = screen.queryAllByRole('combobox');
    expect(selectElements.length).toBe(0);

    // Verify there is no registration link or button on staff portal (staff cannot self-register)
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    const user = userEvent.setup();
    renderStaffLoginPage();

    const submitBtn = screen.getByRole('button', { name: /Authenticate Staff/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Staff email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it('hides quick test staff profiles by default and displays subtle Demo button', () => {
    renderStaffLoginPage();

    // Verify profiles are completely hidden by default
    expect(screen.queryByText(/Quick Test Staff Profiles/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Caretaker$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Technician$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Hostel Admin$/i })).not.toBeInTheDocument();

    // Verify subtle Demo button is present
    expect(screen.getByRole('button', { name: /Demo/i })).toBeInTheDocument();
  });

  it('handles demo access modal: cancel, incorrect password, and successful unlock with profile autofill and hide option', async () => {
    const user = userEvent.setup();
    renderStaffLoginPage();

    const demoBtn = screen.getByRole('button', { name: /Demo/i });
    await user.click(demoBtn);

    // Verify modal opens with Title and Subtitle
    expect(screen.getByRole('heading', { name: /Demo Access/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter the access password to continue/i)).toBeInTheDocument();

    const passwordField = screen.getByPlaceholderText(/Enter access password/i);
    const unlockBtn = screen.getByRole('button', { name: /^Unlock$/i });
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });

    // Test Cancel button closes modal without unlocking
    await user.click(cancelBtn);
    expect(screen.queryByRole('heading', { name: /Demo Access/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick Test Staff Profiles/i)).not.toBeInTheDocument();

    // Reopen modal
    await user.click(demoBtn);
    const reopenPasswordField = screen.getByPlaceholderText(/Enter access password/i);
    const reopenUnlockBtn = screen.getByRole('button', { name: /^Unlock$/i });

    // Test Incorrect Password
    await user.type(reopenPasswordField, 'invalid-pass-99');
    await user.click(reopenUnlockBtn);

    await waitFor(() => {
      expect(screen.getByText(/Incorrect password\. Please try again\./i)).toBeInTheDocument();
    });
    // Modal stays open and profiles remain hidden
    expect(screen.getByRole('heading', { name: /Demo Access/i })).toBeInTheDocument();
    expect(screen.queryByText(/Quick Test Staff Profiles/i)).not.toBeInTheDocument();

    // Test Correct Password: '280723'
    await user.clear(reopenPasswordField);
    await user.type(reopenPasswordField, '280723');
    await user.click(reopenUnlockBtn);

    // Modal closes and profiles are revealed
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Demo Access/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Quick Test Staff Profiles:/i)).toBeInTheDocument();
    });

    // Verify all 6 profiles are visible
    expect(screen.getByRole('button', { name: /Caretaker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Staff \(Asima ♀\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Technician/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Warden\s+warden\.kalam/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Warden \(Asima ♀\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hostel Admin/i })).toBeInTheDocument();

    // Test autofill functionality
    const caretakerBtn = screen.getByRole('button', { name: /Caretaker/i });
    await user.click(caretakerBtn);

    const emailInput = screen.getByLabelText(/Staff Institutional Email/i) as HTMLInputElement;
    const staffPasswordInput = screen.getByLabelText(/^Password/i, { selector: 'input' }) as HTMLInputElement;

    expect(emailInput.value).toBe('caretaker.kalam@iitp.ac.in');
    expect(staffPasswordInput.value).toBe('mock-staff-pass');

    // Test Closing/Hiding Demo Profiles
    const hideBtn = screen.getByRole('button', { name: /Hide Demo/i });
    await user.click(hideBtn);

    // Demo profiles hidden again, subtle Demo button restored
    expect(screen.queryByText(/Quick Test Staff Profiles:/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Demo/i })).toBeInTheDocument();
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
