import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title cannot exceed 120 characters').trim(),
  category: z.enum(['Electrical', 'Plumbing', 'Carpentry', 'Network / Wi-Fi', 'Cleanliness', 'Appliance', 'Other']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters').trim(),
  roomNumber: z.string().min(1, 'Room number is required').trim(),
  block: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).default('Medium'),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().min(1, 'Technician identifier is required'),
  notes: z.string().optional(),
});

export const completeWorkSchema = z.object({
  repairNotes: z.string().min(5, 'Repair notes must be at least 5 characters documenting the fix').trim(),
});

export const rejectComplaintSchema = z.object({
  // SPEC INVARIANT: Rejection is allowed for Caretaker and Warden only, with mandatory reason
  reason: z.string().min(5, 'Rejection reason is mandatory and must be at least 5 characters').trim(),
});

export const reopenRequestSchema = z.object({
  reason: z.string().min(5, 'Reason for reopening the ticket is required').trim(),
});

export const rejectReopenSchema = z.object({
  reason: z.string().min(5, 'Rejection reason is mandatory and must be at least 5 characters').trim(),
});

export const returnWorkInProgressSchema = z.object({
  reason: z.string().min(5, 'Reason for returning work to In Progress is mandatory (min 5 characters)').trim(),
});

export const reprioritizeSchema = z.object({
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment text cannot be empty').max(1000).trim(),
  visibility: z.enum(['public', 'internal']).default('public'),
});

export const reportUnresolvedSchema = z.object({
  remarks: z.string().max(500).optional(),
});
