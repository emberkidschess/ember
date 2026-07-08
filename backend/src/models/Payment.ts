import mongoose, { Schema, Document, Model } from 'mongoose';
import { COURSE_LEVELS } from '../domain/courseEnrollment';
import Counter from './Counter';

export enum PaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue',
}

/**
 * Single financial ledger for every package purchase (new enrollment,
 * renewal, or upgrade). This replaces the previous split between `Payment`
 * (generic record, created when staff marked a link paid) and
 * `PackagePurchase` (created separately at activation, then linked back to
 * Payment after the fact) - one financial event, one record.
 */
export interface IPayment extends Document {
  // Exactly one of student/lead is set - a new enrollment's payment can be
  // recorded before the Student exists (created later at activation time).
  student?: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  paymentLink?: mongoose.Types.ObjectId;
  package?: mongoose.Types.ObjectId; // set once the Package is created at activation
  packageType: string;
  courseLevel: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  manualPaymentReference?: string;
  paymentDate?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      index: true,
    },
    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },
    paymentLink: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentLink',
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    packageType: {
      type: String,
      required: true,
    },
    courseLevel: {
      type: String,
      required: true,
      enum: [...COURSE_LEVELS, 'Master'],
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ['USD', 'CAD', 'INR', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR'],
      default: 'USD',
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['wise'],
      default: 'wise',
    },
    manualPaymentReference: {
      type: String,
    },
    paymentDate: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ student: 1, status: 1 });
PaymentSchema.index({ lead: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, currency: 1, createdAt: -1 });
PaymentSchema.index({ createdBy: 1, createdAt: -1 });
PaymentSchema.index({ paymentLink: 1 }, { unique: true, sparse: true });

const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
