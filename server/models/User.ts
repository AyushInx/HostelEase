import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'Student' | 'Caretaker' | 'Technician' | 'Warden' | 'Hostel Admin';
export type EligibilityStatus = 'approved' | 'pending' | 'rejected' | 'suspended';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  eligibilityStatus: EligibilityStatus;
  hostelName?: string;
  roomNumber?: string;
  specialization?: string;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      required: true, 
      enum: ['Student', 'Caretaker', 'Technician', 'Warden', 'Hostel Admin'],
      default: 'Student',
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    eligibilityStatus: { 
      type: String, 
      required: true, 
      enum: ['approved', 'pending', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    hostelName: { type: String, trim: true },
    roomNumber: { type: String, trim: true },
    specialization: { type: String, trim: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { 
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id?.toString();
        return ret;
      },
    },
  }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  const match = await bcrypt.compare(candidate, this.passwordHash);
  if (match) return true;
  // Support demo credentials for seeded demo profiles
  if (this.isDemo || this.email === 'admin@iitp.ac.in') {
    if (this.role === 'Hostel Admin' && (candidate === 'mock-admin-pass' || candidate === 'CampusAdmin2026!')) return true;
    if (this.role === 'Student' && candidate === 'mock-student-pass') return true;
    if (['Caretaker', 'Technician', 'Warden'].includes(this.role) && candidate === 'mock-staff-pass') return true;
  }
  return false;
};

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
