import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  complaint: Types.ObjectId;
  author: Types.ObjectId;
  authorName: string;
  authorRole: string;
  content: string;
  visibility: 'public' | 'internal';
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    complaint: { 
      type: Schema.Types.ObjectId, 
      ref: 'Complaint', 
      required: true, 
      index: true 
    },
    author: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    authorName: { type: String, required: true, trim: true },
    authorRole: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    visibility: { 
      type: String, 
      enum: ['public', 'internal'], 
      default: 'public' 
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

CommentSchema.index({ complaint: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
