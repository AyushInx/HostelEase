import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate';
import { loginSchema, sendOtpSchema, verifyOtpSchema, verifyDemoSchema } from '../schemas/auth.schema';
import { requireAuth } from '../middleware/auth';
import { CSRF_COOKIE_NAME } from '../middleware/csrf';
import { otpRateLimiter, otpCooldownLimiter, verifyRateLimiter, loginRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Handshake endpoint to retrieve current CSRF token
router.get('/csrf-token', (req, res) => {
  const token = req.cookies[CSRF_COOKIE_NAME] || res.locals.csrfToken;
  res.status(200).json({ success: true, data: { csrfToken: token } });
});

// Domain-restricted college email OTP endpoints with rate limiting & cooldown
router.post(
  '/send-otp',
  validateRequest({ body: sendOtpSchema }),
  otpCooldownLimiter,
  otpRateLimiter,
  (req, res, next) => authController.sendOtp(req, res, next)
);

router.post(
  '/verify-otp',
  validateRequest({ body: verifyOtpSchema }),
  verifyRateLimiter,
  (req, res, next) => authController.verifyOtp(req, res, next)
);

router.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginSchema }),
  (req, res, next) => authController.login(req, res, next)
);

router.get('/me', requireAuth, (req, res, next) => authController.me(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Password-protected demo access verification
router.post(
  '/verify-demo',
  validateRequest({ body: verifyDemoSchema }),
  (req, res, next) => authController.verifyDemo(req, res, next)
);

export default router;

