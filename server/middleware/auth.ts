import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../models/User';

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hostelName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
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
