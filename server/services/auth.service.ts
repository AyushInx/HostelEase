import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { signSessionToken, AuthUserPayload } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { auditService } from './audit.service';

export class AuthService {
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
      eligibilityStatus: 'approved',
    });

    await admin.save();
    console.log(`✅ Bootstrapped primary Hostel Admin: ${admin.email}`);
    return admin;
  }
}

export const authService = new AuthService();
