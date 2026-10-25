import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'Student' | 'Caretaker' | 'Technician' | 'Warden' | 'Hostel Admin';
export type EligibilityStatus = 'approved' | 'pending' | 'suspended';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  eligibilityStatus: EligibilityStatus;
  hostelName?: string;
  roomNumber?: string;
  specialization?: string;
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
    eligibilityStatus: { 
      type: String, 
      required: true, 
      enum: ['approved', 'pending', 'suspended'],
      default: 'approved',
    },
    hostelName: { type: String, trim: true },
    roomNumber: { type: String, trim: true },
    specialization: { type: String, trim: true },
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
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
