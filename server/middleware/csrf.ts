import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'x-xsrf-token';

/**
 * Double-submit cookie CSRF protection middleware.
 * - Issues an accessible XSRF-TOKEN cookie on initial request if absent.
 * - Enforces that mutating HTTP requests (POST, PUT, PATCH, DELETE) supply
 *   an identical matching token in the 'x-xsrf-token' or 'x-csrf-token' header.
 * - Safe HTTP methods (GET, HEAD, OPTIONS) are exempt from verification.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  let cookieToken = req.cookies[CSRF_COOKIE_NAME];

  if (!cookieToken) {
    cookieToken = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, cookieToken, {
      httpOnly: false, // Must be readable by client JavaScript for double-submit
      secure: env.NODE_ENV === 'production', // true only in production per SPEC
      sameSite: 'lax',
      path: '/',
    });
  }

  res.locals.csrfToken = cookieToken;

  // Safe HTTP methods do not change state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Mutating requests require matching token in header
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers['x-csrf-token'];

  if (!headerToken || typeof headerToken !== 'string' || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF validation failed: Missing or invalid CSRF token. State-changing requests require a matching x-xsrf-token header.',
    });
    return;
  }

  next();
}
