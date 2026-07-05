import mongoose, { Schema, Document, Model } from 'mongoose';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface IDeliveryLog extends Document {
  notificationId: mongoose.Types.ObjectId;
  channel: string;
  recipient: string;
  status: DeliveryStatus;
  messageId?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryLogSchema: Schema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ['email', 'whatsapp'],
    },
    recipient: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

DeliveryLogSchema.index({ notificationId: 1, channel: 1 });
DeliveryLogSchema.index({ status: 1, createdAt: -1 });
DeliveryLogSchema.index({ channel: 1, status: 1 });

const DeliveryLog: Model<IDeliveryLog> = mongoose.models.DeliveryLog || mongoose.model<IDeliveryLog>('DeliveryLog', DeliveryLogSchema);

export default DeliveryLog;
