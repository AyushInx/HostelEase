import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

const allLimiterRegistries: Array<Map<string, RateLimitRecord>> = [];

export function resetRateLimits(): void {
  for (const reg of allLimiterRegistries) {
    reg.clear();
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  const records = new Map<string, RateLimitRecord>();
  allLimiterRegistries.push(records);
  const { windowMs, max, message = 'Too many requests. Please try again later.' } = options;

  // Cleanup expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now > record.resetAt) {
        records.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow passing or custom header to bypass if necessary, or evaluate strictly
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.ip || req.socket.remoteAddress || 'unknown-client');

    const now = Date.now();
    const existing = records.get(key);

    if (!existing || now > existing.resetAt) {
      records.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}

// Specialized rate limiters
export const otpCooldownLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 60-second cooldown per email
  max: 1,
  message: 'Please wait 60 seconds before requesting another verification code.',
  keyGenerator: (req) => `cooldown_${(req.body?.email || '').toLowerCase().trim()}`,
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many OTP requests from this address. Please wait before requesting another code.',
  keyGenerator: (req) => `${req.ip || 'ip'}_${(req.body?.email || '').toLowerCase().trim()}`,
});

export const verifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts. Please wait before trying again.',
  keyGenerator: (req) => `${req.ip || 'ip'}_${req.body?.email || ''}`,
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait before trying again.',
  keyGenerator: (req) => `${req.ip || 'ip'}_${req.body?.email || ''}`,
});
