import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').optional(),
  token: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
}).refine((data) => data.otp || data.token, {
  message: 'Either OTP code or verification link token is required.',
  path: ['otp'],
});

export const provisionStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid institutional email').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['Caretaker', 'Technician', 'Warden', 'Hostel Admin']),
  hostelName: z.string().optional(),
  specialization: z.string().optional(),
});

export const updateStudentEligibilitySchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended']),
  reason: z.string().optional(),
});

export const changeStaffRoleSchema = z.object({
  role: z.enum(['Caretaker', 'Technician', 'Warden', 'Hostel Admin']),
});

