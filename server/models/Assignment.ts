import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAssignment extends Document {
  complaint: Types.ObjectId;
  actor: Types.ObjectId;
  actorName: string;
  actorRole: string;
  fromTechnician?: Types.ObjectId;
  fromTechnicianName?: string;
  toTechnician: Types.ObjectId;
  toTechnicianName: string;
  reason?: string;
  assignedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    complaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true },
    fromTechnician: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fromTechnicianName: { type: String, trim: true },
    toTechnician: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toTechnicianName: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    assignedAt: { type: Date, default: Date.now, index: true },
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

AssignmentSchema.index({ complaint: 1, assignedAt: -1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
