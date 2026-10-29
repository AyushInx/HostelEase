import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  link?: string;
  readStatus: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    type: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    readStatus: { type: Boolean, default: false },
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

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
