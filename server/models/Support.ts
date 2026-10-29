import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupport extends Document {
  complaint: Types.ObjectId;
  student: Types.ObjectId;
  createdAt: Date;
}

const SupportSchema = new Schema<ISupport>(
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
    createdAt: { type: Date, default: Date.now },
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

// SPEC INVARIANT: Unique index on (complaint, student) preventing duplicate community support (+1)
SupportSchema.index({ complaint: 1, student: 1 }, { unique: true });

export const Support = (mongoose.models.Support as mongoose.Model<ISupport>) || mongoose.model<ISupport>('Support', SupportSchema);
