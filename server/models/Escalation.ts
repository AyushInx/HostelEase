import mongoose, { Schema, Document, Types } from 'mongoose';

export type SLAType = 'acknowledgment' | 'resolution';
export type EscalationTier = 'tier1_warden' | 'tier2_admin';

export interface IEscalation extends Document {
  complaint: Types.ObjectId;
  slaType: SLAType;
  escalationTier: EscalationTier;
  triggeredAt: Date;
  reason: string;
  targetRole: 'Warden' | 'Hostel Admin';
  resolvedAt?: Date;
}

const EscalationSchema = new Schema<IEscalation>(
  {
    complaint: { 
      type: Schema.Types.ObjectId, 
      ref: 'Complaint', 
      required: true, 
      index: true 
    },
    slaType: { 
      type: String, 
      required: true, 
      enum: ['acknowledgment', 'resolution'] 
    },
    escalationTier: { 
      type: String, 
      required: true, 
      enum: ['tier1_warden', 'tier2_admin'] 
    },
    triggeredAt: { type: Date, default: Date.now },
    reason: { type: String, required: true, trim: true },
    targetRole: { 
      type: String, 
      required: true, 
      enum: ['Warden', 'Hostel Admin'] 
    },
    resolvedAt: { type: Date },
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

// Idempotent escalation: one record per complaint, SLA type, and tier
EscalationSchema.index({ complaint: 1, slaType: 1, escalationTier: 1 }, { unique: true });

export const Escalation = mongoose.model<IEscalation>('Escalation', EscalationSchema);
