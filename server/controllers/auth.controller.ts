import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { SESSION_COOKIE_NAME } from '../middleware/auth';
import { env } from '../config/env';

function getCookieOptions() {
  const isCrossDomain = env.NODE_ENV === 'production' && !!env.CLIENT_ORIGIN && !env.CLIENT_ORIGIN.includes('localhost');
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: (isCrossDomain ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export class AuthController {
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, type } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.sendOtp(email, type, ip, userAgent);

      res.status(200).json({
        success: true,
        message: 'Verification code sent to your institutional email.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp, token: magicToken, name } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const { user, token } = await authService.verifyOtp(email, otp, magicToken, name, ip, userAgent);

      // Set httpOnly secure session cookie
      res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const { user, token } = await authService.login(email, password, ip, userAgent);

      // Set httpOnly secure session cookie
      res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());

      res.status(200).json({
        success: true,
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const user = await authService.getCurrentUser(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const opts = getCookieOptions();
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: opts.httpOnly,
        secure: opts.secure,
        sameSite: opts.sameSite,
      });
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = req.body;
      const expectedPassword = env.DEMO_ACCESS_PASSWORD || '280723';
      if (password === expectedPassword) {
        res.status(200).json({
          success: true,
          message: 'Demo access granted',
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
