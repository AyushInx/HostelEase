import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actor?: Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity: 'Complaint' | 'Staff' | 'Hostel' | 'SLA' | 'Auth' | 'Student';
  entityId: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    targetEntity: { 
      type: String, 
      required: true, 
      enum: ['Complaint', 'Staff', 'Hostel', 'SLA', 'Auth', 'Student'],
      index: true 
    },
    entityId: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { 
    timestamps: false,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Reverse chronological indexing for audit trail inspection
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
