import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { Verification, VerificationType, computeOtpVerifier } from '../models/Verification';
import { signSessionToken, AuthUserPayload } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { auditService } from './audit.service';
import { emailService } from './email.service';

export function isCollegeEmail(email: string): boolean {
  return email.toLowerCase().trim().endsWith('@iitp.ac.in');
}

export class AuthService {
  /**
   * Generates a 6-digit numeric OTP, persists keyed verification record in MongoDB,
   * dispatches email via Resend, and invalidates any previous pending codes.
   */
  async sendOtp(
    email: string,
    type: VerificationType = 'email_verification',
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ email: string; expiresAt: Date; verificationId: string }> {
    const cleanEmail = email.toLowerCase().trim();

    if (!isCollegeEmail(cleanEmail)) {
      throw new AppError('Institutional college email is required (must end with @iitp.ac.in).', 400);
    }

    // 1. Generate unpredictable cryptographically secure 6-digit numeric OTP
    // Range: 100000 to 999999 inclusive
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const verificationId = crypto.randomUUID();
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 2. Compute server-secret keyed HMAC-SHA256 verifier (keyed verifier invariant)
    const otpHash = computeOtpVerifier(cleanEmail, rawOtp, verificationId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry (SPEC requirement)

    // 3. Mark all previous pending verification records for this email as consumed
    await Verification.updateMany(
      { email: cleanEmail, consumed: false },
      { $set: { consumed: true } }
    );

    // 4. Persist verification record in MongoDB
    const verification = new Verification({
      verificationId,
      email: cleanEmail,
      otpHash,
      token: rawToken,
      type,
      deliveryStatus: 'pending',
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      consumed: false,
    });
    await verification.save();

    // 5. Send real email via Resend (or test harness in test environment)
    try {
      await emailService.sendOtpEmail(cleanEmail, rawOtp, 10);
      verification.deliveryStatus = 'sent';
      await verification.save();
    } catch (deliveryErr: any) {
      // Invariant: Failed delivery must NOT leave a usable active OTP in the database
      verification.deliveryStatus = 'failed';
      verification.deliveryError = deliveryErr.message;
      verification.consumed = true;
      await verification.save();

      await auditService.record({
        action: 'OTP_DELIVERY_FAILED',
        targetEntity: 'Auth',
        entityId: cleanEmail,
        details: `Failed to deliver verification code to ${cleanEmail}: ${deliveryErr.message}`,
        ipAddress,
        userAgent,
      });

      throw new AppError(`Failed to dispatch verification email: ${deliveryErr.message}`, 502);
    }

    // 6. Audit event without logging plain OTP
    await auditService.record({
      action: 'OTP_REQUESTED',
      targetEntity: 'Auth',
      entityId: cleanEmail,
      details: `Verification code generated and sent to ${cleanEmail} (ID: ${verificationId}, Expiry: ${expiresAt.toISOString()}).`,
      ipAddress,
      userAgent,
    });

    // Invariant: NEVER send the OTP or its hash to the client in the API response
    return {
      email: cleanEmail,
      expiresAt,
      verificationId,
    };
  }

  /**
   * Atomically verifies candidate OTP against the intended active verification record in MongoDB.
   * Enforces 10-minute expiry, 5-attempt limit, atomic consumption, and separation of verification vs eligibility.
   */
  async verifyOtp(
    email: string,
    candidateOtp?: string,
    candidateToken?: string,
    name?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: AuthUserPayload; token: string }> {
    const cleanEmail = email.toLowerCase().trim();

    if (!isCollegeEmail(cleanEmail)) {
      throw new AppError('Institutional college email is required (must end with @iitp.ac.in).', 400);
    }

    // Retrieve the active verification record for this specific normalized email
    const verification = await Verification.findOne({
      email: cleanEmail,
    }).sort({ createdAt: -1 });

    if (!verification) {
      throw new AppError('No active verification request found for this email address.', 404);
    }

    if (verification.consumed) {
      if (verification.attempts >= verification.maxAttempts) {
        throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 429);
      }
      throw new AppError('No active verification request found for this email address.', 404);
    }

    // 1. Enforce expiry check
    if (new Date() > verification.expiresAt) {
      await Verification.updateOne({ _id: verification._id }, { $set: { consumed: true } });
      throw new AppError('Verification code has expired. Please request a new code.', 400);
    }

    // 2. Enforce maximum failed attempts limit (SPEC: 5 attempts max)
    if (verification.attempts >= verification.maxAttempts) {
      await Verification.updateOne({ _id: verification._id }, { $set: { consumed: true } });
      throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 429);
    }

    // 3. Reject hardcoded prototype bypasses in production
    // (Never accept 123456 as a backdoor)
    let isMatch = false;
    if (candidateOtp) {
      isMatch = await verification.verifyOtp(candidateOtp);
    } else if (candidateToken) {
      isMatch = verification.token === candidateToken;
    }

    if (!isMatch) {
      // Atomically increment failed attempts count
      const updated = await Verification.findOneAndUpdate(
        { _id: verification._id, consumed: false },
        { $inc: { attempts: 1 } },
        { returnDocument: 'after' }
      );

      const attemptsCount = updated ? updated.attempts : verification.attempts + 1;
      const remaining = Math.max(0, verification.maxAttempts - attemptsCount);

      if (attemptsCount >= verification.maxAttempts) {
        await Verification.updateOne({ _id: verification._id }, { $set: { consumed: true } });
        throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 429);
      }

      throw new AppError(`Invalid verification code. ${remaining} attempt(s) remaining.`, 400);
    }

    // 4. Atomic Consumption: Only one concurrent request can consume this OTP
    const consumed = await Verification.findOneAndUpdate(
      {
        _id: verification._id,
        consumed: false,
        attempts: { $lt: verification.maxAttempts },
      },
      {
        $set: {
          consumed: true,
          consumedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!consumed) {
      throw new AppError('This verification code has already been consumed or invalidated.', 400);
    }

    // 5. Create or retrieve user safely with race condition handling
    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      user.isEmailVerified = true;
      await user.save();
    } else {
      try {
        const defaultPasswordHash = await bcrypt.hash('StudentPass2026!', 10);
        user = new User({
          name: name?.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          passwordHash: defaultPasswordHash,
          role: 'Student', // Server-enforced role invariant
          isEmailVerified: true,
          eligibilityStatus: 'pending', // SPEC Invariant: Verification != Eligibility Approval
        });
        await user.save();
      } catch (err: any) {
        if (err.code === 11000) {
          // Concurrent insert resolved, retrieve existing user
          user = await User.findOne({ email: cleanEmail });
          if (user) {
            user.isEmailVerified = true;
            await user.save();
          }
        } else {
          throw err;
        }
      }
    }

    if (!user) {
      throw new AppError('Failed to establish user account after verification.', 500);
    }

    const payload: AuthUserPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      eligibilityStatus: user.eligibilityStatus,
      hostelName: user.hostelName,
    };

    const token = signSessionToken(payload);

    await auditService.record({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'EMAIL_VERIFIED',
      targetEntity: 'Auth',
      entityId: user.email,
      details: `Institutional email ${user.email} verified successfully. Eligibility: ${user.eligibilityStatus}.`,
      ipAddress,
      userAgent,
    });

    return { user: payload, token };
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: AuthUserPayload; token: string }> {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new AppError('Invalid credentials provided.', 401);
    }

    if (user.eligibilityStatus === 'suspended') {
      throw new AppError('This account has been suspended by administration.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials provided.', 401);
    }

    const payload: AuthUserPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      eligibilityStatus: user.eligibilityStatus,
      hostelName: user.hostelName,
    };

    const token = signSessionToken(payload);

    await auditService.record({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      targetEntity: 'Auth',
      entityId: user._id.toString(),
      details: `User ${user.email} (${user.role}) logged in successfully.`,
      ipAddress,
      userAgent,
    });

    return { user: payload, token };
  }

  async getCurrentUser(userId: string): Promise<IUser | null> {
    return User.findById(userId).select('-passwordHash');
  }

  async bootstrapAdmin(name: string, email: string, password: string): Promise<IUser> {
    const existingAdmin = await User.findOne({ role: 'Hostel Admin' });
    if (existingAdmin) {
      return existingAdmin;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = new User({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'Hostel Admin',
      isEmailVerified: true,
      eligibilityStatus: 'approved',
    });

    await admin.save();
    console.log(`✅ Bootstrapped primary Hostel Admin: ${admin.email}`);
    return admin;
  }
}

export const authService = new AuthService();
