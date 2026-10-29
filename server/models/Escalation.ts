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
  gracePeriodMinutes?: number;
  resolvedAt?: Date;
}

export interface IEscalationSLAConfig {
  acknowledgmentDeadlineMinutes: number; // Acknowledgment SLA stops once ticket reaches Seen
  resolutionDeadlineMinutes: number;     // Resolution SLA stops once ticket reaches Resolved
  tier2GracePeriodMinutes: number;       // Configurable grace period following Tier 1 before Tier 2 triggers
}

export const DEFAULT_SLA_CONFIG: Record<string, IEscalationSLAConfig> = {
  Emergency: { acknowledgmentDeadlineMinutes: 30, resolutionDeadlineMinutes: 240, tier2GracePeriodMinutes: 60 },
  High: { acknowledgmentDeadlineMinutes: 60, resolutionDeadlineMinutes: 720, tier2GracePeriodMinutes: 120 },
  Medium: { acknowledgmentDeadlineMinutes: 120, resolutionDeadlineMinutes: 1440, tier2GracePeriodMinutes: 240 },
  Low: { acknowledgmentDeadlineMinutes: 240, resolutionDeadlineMinutes: 2880, tier2GracePeriodMinutes: 480 },
};

/**
 * Evaluates whether Tier 2 escalation can trigger following a Tier 1 escalation.
 * Tier 2 triggers only after the configurable grace period has elapsed.
 */
export function canTriggerTier2Escalation(
  tier1TriggeredAt: Date,
  gracePeriodMinutes: number = 120
): boolean {
  const elapsedMs = Date.now() - new Date(tier1TriggeredAt).getTime();
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
  return elapsedMs >= gracePeriodMs;
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
    gracePeriodMinutes: { type: Number, default: 120 },
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
