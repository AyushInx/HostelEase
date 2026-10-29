import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUnresolvedReport extends Document {
  complaint: Types.ObjectId;
  student: Types.ObjectId;
  remarks?: string;
  reportedAt: Date;
}

const UnresolvedReportSchema = new Schema<IUnresolvedReport>(
  {
    complaint: { 
      type: Schema.Types.ObjectId, 
      ref: 'Complaint', 
      required: true, 
      index: true 
    },
    student: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    remarks: { type: String, trim: true },
    reportedAt: { type: Date, default: Date.now },
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

// SPEC INVARIANT: Unique index on (complaint, student) preventing duplicate unresolved reports
UnresolvedReportSchema.index({ complaint: 1, student: 1 }, { unique: true });

export const UnresolvedReport =
  (mongoose.models.UnresolvedReport as mongoose.Model<IUnresolvedReport>) ||
  mongoose.model<IUnresolvedReport>('UnresolvedReport', UnresolvedReportSchema);
