import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/hostel_complaints'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('hostel_complaint_jwt_super_secret_key_2026'),
  COOKIE_SECRET: z.string().default('hostel_complaint_cookie_secret_2026'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  
  // First Hostel Admin bootstrapping configuration (Rule: reading from env vars, no public path)
  INITIAL_ADMIN_NAME: z.string().default('Campus Chief Admin'),
  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@iitp.ac.in'),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default('CampusAdmin2026!'),

  // Configurable grace period (minutes) for Tier 2 escalation following Tier 1
  TIER2_GRACE_PERIOD_MINUTES: z.string().default('120').transform((val) => parseInt(val, 10)),

  // Production Resend Email Delivery Configuration
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('HostelEase <onboarding@resend.dev>'),

  // Keyed HMAC Secret for 6-digit OTP verification (keyed verifier invariant)
  OTP_SECRET: z.string().min(16, 'OTP_SECRET must be at least 16 characters').default('hostel_complaint_otp_hmac_secret_2026'),
  PREVIOUS_OTP_SECRET: z.string().optional(),

  // Password-Protected Demo Access
  DEMO_ACCESS_PASSWORD: z.string().default('280723'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.warn('⚠️ Environment configuration warnings:');
  console.warn(JSON.stringify(parsedEnv.error.format(), null, 2));
}

export const env = parsedEnv.success ? parsedEnv.data : (envSchema.parse({}) as any);
