import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';
import type { UserRole, EligibilityStatus } from '../models/User';
import { Complaint, IComplaint } from '../models/Complaint';

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified?: boolean;
  eligibilityStatus?: EligibilityStatus;
  hostelName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      complaint?: IComplaint;
    }
  }
}

export const SESSION_COOKIE_NAME = 'hct_session';

export function signSessionToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
  } catch {
    return null;
  }
}

export function authenticateSession(req: Request, _res: Response, next: NextFunction): void {
  // Session retrieved from httpOnly cookie (Rule: httpOnly, secure, sameSite cookie sessions; no tokens in localStorage)
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = cookieToken || bearerToken;

  if (token) {
    const decoded = verifySessionToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
    return;
  }
  next();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized for this action.`,
      });
      return;
    }

    next();
  };
}

export function requireVerified(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  if (req.user.isEmailVerified === false) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Institutional email verification required.',
    });
    return;
  }

  next();
}

export function requireApprovedEligibility(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  if (req.user.role === 'Student' && req.user.eligibilityStatus !== 'approved') {
    res.status(403).json({
      success: false,
      error: `Access denied. Hostel residency eligibility approval required (Current status: ${req.user.eligibilityStatus || 'pending'}).`,
    });
    return;
  }

  next();
}

export function requireHostelScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  // Hostel Admin has cross-hostel visibility
  if (req.user.role === 'Hostel Admin') {
    return next();
  }

  // Caretaker and Warden are restricted to their assigned hostel
  const targetHostel = (req.body?.hostelName || req.query?.hostelName) as string | undefined;
  if (targetHostel && req.user.hostelName && targetHostel !== req.user.hostelName) {
    res.status(403).json({
      success: false,
      error: `Access denied. You cannot manage complaints outside your designated jurisdiction (${req.user.hostelName}).`,
    });
    return;
  }

  next();
}

/**
 * Reusable server-side authorization middleware checking object-level access:
 * - Prevents a Student from reading another student's complaint
 * - Prevents Technicians from viewing unassigned complaints
 * - Restricts Caretakers and Wardens to their hostel jurisdiction
 */
export async function requireComplaintAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  const rawId = req.params.id;
  const idOrRef = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!idOrRef) {
    res.status(400).json({ success: false, error: 'Complaint ID is required.' });
    return;
  }

  const isObjectId = Types.ObjectId.isValid(idOrRef);
  const complaint = await Complaint.findOne(
    isObjectId ? { $or: [{ _id: idOrRef }, { referenceId: idOrRef }] } : { referenceId: idOrRef }
  );

  if (!complaint) {
    res.status(404).json({ success: false, error: 'Complaint ticket not found.' });
    return;
  }

  // Object-level ownership check for Students (SPEC invariant: student reading another's complaint forbidden)
  if (req.user.role === 'Student' && complaint.student.toString() !== req.user.id) {
    res.status(403).json({
      success: false,
      error: 'Access denied: You do not have permission to view or manage this ticket.',
    });
    return;
  }

  // Technician scoped to assigned complaints
  if (req.user.role === 'Technician' && complaint.assignedTechnician?.toString() !== req.user.id) {
    res.status(403).json({
      success: false,
      error: 'Access denied: You are not the assigned technician for this ticket.',
    });
    return;
  }

  // Caretaker & Warden scoped to their designated hostel
  if (
    (req.user.role === 'Caretaker' || req.user.role === 'Warden') &&
    req.user.hostelName &&
    complaint.hostelName !== req.user.hostelName
  ) {
    res.status(403).json({
      success: false,
      error: `Access denied: Complaint is outside your designated jurisdiction (${req.user.hostelName}).`,
    });
    return;
  }

  req.complaint = complaint;
  next();
}
