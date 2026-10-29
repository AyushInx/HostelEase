import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ComplaintStatus } from './Complaint';

export interface IStatusHistory extends Document {
  complaint: Types.ObjectId;
  actor: Types.ObjectId;
  actorName: string;
  actorRole: string;
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus;
  remarks?: string;
  timestamp: Date;
}

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    complaint: { 
      type: Schema.Types.ObjectId, 
      ref: 'Complaint', 
      required: true, 
      index: true 
    },
    actor: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    remarks: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
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

StatusHistorySchema.index({ complaint: 1, timestamp: -1 });

export const StatusHistory = (mongoose.models.StatusHistory as mongoose.Model<IStatusHistory>) || mongoose.model<IStatusHistory>('StatusHistory', StatusHistorySchema);
