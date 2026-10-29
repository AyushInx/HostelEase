import mongoose, { Schema, Document, Types } from 'mongoose';

export type ComplaintCategory = 
  | 'Electrical' 
  | 'Plumbing' 
  | 'Carpentry' 
  | 'Network / Wi-Fi' 
  | 'Cleanliness' 
  | 'Appliance' 
  | 'Other';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type ComplaintStatus = 
  | 'Submitted' 
  | 'Seen' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Work Completed' 
  | 'Resolved' 
  | 'Rejected' 
  | 'Reopened';

export interface IComplaint extends Document {
  referenceId: string;
  student: Types.ObjectId;
  studentName: string;
  hostelName: string;
  block?: string;
  roomNumber: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTechnician?: Types.ObjectId;
  assignedTechnicianName?: string;
  rejectionReason?: string;
  repairNotes?: string;
  resolutionNotes?: string;
  acknowledgedAt?: Date;
  escalationLevel: 'none' | 'tier1_warden' | 'tier2_admin';
  isDemo?: boolean;
  supportCount: number;
  unresolvedReportsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    referenceId: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      trim: true 
    },
    student: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    studentName: { type: String, required: true, trim: true },
    hostelName: { type: String, required: true, index: true, trim: true },
    block: { type: String, trim: true },
    roomNumber: { type: String, required: true, trim: true },
    category: { 
      type: String, 
      required: true, 
      enum: ['Electrical', 'Plumbing', 'Carpentry', 'Network / Wi-Fi', 'Cleanliness', 'Appliance', 'Other'],
      index: true 
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { 
      type: String, 
      required: true, 
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
      index: true 
    },
    status: { 
      type: String, 
      required: true, 
      enum: ['Submitted', 'Seen', 'Assigned', 'In Progress', 'Work Completed', 'Resolved', 'Rejected', 'Reopened'],
      default: 'Submitted',
      index: true 
    },
    assignedTechnician: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTechnicianName: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    repairNotes: { type: String, trim: true },
    resolutionNotes: { type: String, trim: true },
    acknowledgedAt: { type: Date },
    escalationLevel: { 
      type: String, 
      enum: ['none', 'tier1_warden', 'tier2_admin'],
      default: 'none' 
    },
    supportCount: { type: Number, default: 0, min: 0 },
    unresolvedReportsCount: { type: Number, default: 0, min: 0 },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { 
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Generate random ticket reference HCT-2026-XXXXX
export function generateTicketReference(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `HCT-${year}-${rand}`;
}

export const Complaint = mongoose.model<IComplaint>('Complaint', ComplaintSchema);
