import mongoose, { Schema, Document } from 'mongoose';

export interface IHostelBlock {
  name: string;
  floors: number;
  roomsCount: number;
}

export interface IHostel extends Document {
  name: string;
  code: string;
  blocks: IHostelBlock[];
  caretakerName?: string;
  wardenName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HostelBlockSchema = new Schema<IHostelBlock>(
  {
    name: { type: String, required: true, trim: true },
    floors: { type: Number, required: true, default: 4 },
    roomsCount: { type: Number, required: true, default: 120 },
  },
  { _id: true }
);

const HostelSchema = new Schema<IHostel>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    blocks: [HostelBlockSchema],
    caretakerName: { type: String, trim: true },
    wardenName: { type: String, trim: true },
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

export const Hostel = mongoose.model<IHostel>('Hostel', HostelSchema);
