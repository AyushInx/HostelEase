import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const provisionStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid institutional email').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['Caretaker', 'Technician', 'Warden', 'Hostel Admin']),
  hostelName: z.string().optional(),
  specialization: z.string().optional(),
});
