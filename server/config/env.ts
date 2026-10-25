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
  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@campus.edu'),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default('CampusAdmin2026!'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment configuration validation failed:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
