import mongoose, { Schema, Document, Model } from 'mongoose';
import { COURSE_LEVELS } from '../domain/courseEnrollment';

/**
 * Manual-verification payment flow (no payment gateway):
 *
 *   ACTIVE -> WAITING_FOR_ACTIVATION  (staff manually marks payment as received)
 *   ACTIVE -> EXPIRED                 (7 days pass with no payment marked)
 *   ACTIVE -> CANCELLED               (staff cancels before payment)
 *   WAITING_FOR_ACTIVATION -> ACTIVATED  (staff assigns coach/batch/schedule,
 *                                          package + portal are created)
 */
export enum PaymentLinkStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  WAITING_FOR_ACTIVATION = 'waiting_for_activation',
  ACTIVATED = 'activated',
  CANCELLED = 'cancelled',
}

export enum PaymentLinkPurpose {
  NEW_PACKAGE = 'new_package',
  RENEWAL = 'renewal',
  UPGRADE = 'upgrade',
}

export enum PaymentMethod {
  WISE = 'wise',
}

export interface IPaymentLink extends Document {
  // Exactly one of student/lead is set. New enrollments (purpose=new_package)
  // start from a lead, since the Student record doesn't exist until the
  // payment is confirmed and the student is actually enrolled. Renewals and
  // upgrades always reference an existing student.
  student?: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  notes?: string;
  // A shareable reference URL the staff can copy/paste manually (e.g. to a
  // payment instructions page showing Wise details) - not a gateway
  // checkout link, just a stable deep link to view this payment link.
  shareableUrl: string;
  status: PaymentLinkStatus;
  purpose: PaymentLinkPurpose;
  packageType?: string;
  courseLevel?: string;
  previousPackageId?: mongoose.Types.ObjectId;
  paymentMethod?: PaymentMethod;
  manualPaymentReference?: string;
  expiresAt: Date;
  paidAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId; // staff who manually confirmed receipt
  sentVia?: ('email' | 'whatsapp' | 'copy_link')[];
  sentAt?: Date;
  activatedAt?: Date;
  activatedBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  expiredAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema: Schema = new Schema(
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
    notes: {
      type: String,
    },
    shareableUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentLinkStatus),
      default: PaymentLinkStatus.ACTIVE,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: Object.values(PaymentLinkPurpose),
      required: true,
    },
    packageType: {
      type: String,
    },
    courseLevel: {
      type: String,
      enum: [...COURSE_LEVELS, 'Master'],
    },
    previousPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.WISE,
    },
    manualPaymentReference: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    paidAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    sentVia: {
      type: [String],
      enum: ['email', 'whatsapp', 'copy_link'],
      default: [],
    },
    sentAt: {
      type: Date,
    },
    activatedAt: {
      type: Date,
    },
    activatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    expiredAt: {
      type: Date,
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

PaymentLinkSchema.pre('validate', function normalizePaymentMethod(next) {
  if (!this.paymentMethod || this.paymentMethod !== PaymentMethod.WISE) {
    this.paymentMethod = PaymentMethod.WISE;
  }
  next();
});

PaymentLinkSchema.index({ student: 1, status: 1 });
PaymentLinkSchema.index({ lead: 1, status: 1 });
PaymentLinkSchema.index({ status: 1, createdAt: -1 });
PaymentLinkSchema.index({ expiresAt: 1, status: 1 });

// Do not use a MongoDB TTL index here. Payment links are accounting/support
// records and must be preserved after expiry; controllers and scheduled jobs
// should transition ACTIVE -> EXPIRED explicitly instead of deleting documents.

const PaymentLink: Model<IPaymentLink> = mongoose.models.PaymentLink || mongoose.model<IPaymentLink>('PaymentLink', PaymentLinkSchema);

export default PaymentLink;
