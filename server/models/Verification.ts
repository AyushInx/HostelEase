import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export type VerificationType = 'registration' | 'login' | 'email_verification';
export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export interface IVerification extends Document {
  verificationId: string;
  email: string;
  otpHash: string;
  token: string;
  type: VerificationType;
  deliveryStatus: DeliveryStatus;
  deliveryError?: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  verifyOtp(candidateOtp: string): Promise<boolean>;
}

/**
 * Keyed HMAC-SHA256 verifier for low-entropy 6-digit numeric OTPs.
 * Binds the secret key to the normalized email and unique verificationId.
 */
export function computeOtpVerifier(
  email: string,
  otp: string,
  verificationId: string,
  customSecret?: string
): string {
  const secret = customSecret || env.OTP_SECRET || env.JWT_SECRET;
  const normalized = `${email.toLowerCase().trim()}:${otp.trim()}:${verificationId}`;
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

/**
 * Constant-time comparison to prevent timing side-channel attacks,
 * with zero-downtime key rotation support via PREVIOUS_OTP_SECRET.
 */
export function verifyKeyedOtp(
  candidateOtp: string,
  email: string,
  verificationId: string,
  storedVerifier: string
): boolean {
  if (!candidateOtp || !storedVerifier) return false;

  // 1. Check with current active secret
  const currentExpected = computeOtpVerifier(email, candidateOtp, verificationId);
  const bufCurrent = Buffer.from(currentExpected, 'hex');
  const bufStored = Buffer.from(storedVerifier, 'hex');

  if (bufCurrent.length === bufStored.length && crypto.timingSafeEqual(bufCurrent, bufStored)) {
    return true;
  }

  // 2. Check with previous secret during key rotation window
  if (env.PREVIOUS_OTP_SECRET) {
    const prevExpected = computeOtpVerifier(email, candidateOtp, verificationId, env.PREVIOUS_OTP_SECRET);
    const bufPrev = Buffer.from(prevExpected, 'hex');
    if (bufPrev.length === bufStored.length && crypto.timingSafeEqual(bufPrev, bufStored)) {
      return true;
    }
  }

  return false;
}

const VerificationSchema = new Schema<IVerification>(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomUUID(),
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['registration', 'login', 'email_verification'],
      default: 'email_verification',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    deliveryError: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true,
    },
    consumedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch latest active verification for a given email
VerificationSchema.index({ email: 1, consumed: 1, expiresAt: 1, createdAt: -1 });

// Helper to verify OTP candidate (supporting keyed HMAC with fallback to bcrypt for legacy records)
VerificationSchema.methods.verifyOtp = async function (candidateOtp: string): Promise<boolean> {
  // If stored verifier is bcrypt (starts with $2)
  if (this.otpHash.startsWith('$2')) {
    return bcrypt.compare(candidateOtp, this.otpHash);
  }

  // Keyed HMAC verification
  return verifyKeyedOtp(candidateOtp, this.email, this.verificationId, this.otpHash);
};

export const Verification =
  (mongoose.models.Verification as mongoose.Model<IVerification>) ||
  mongoose.model<IVerification>('Verification', VerificationSchema);
