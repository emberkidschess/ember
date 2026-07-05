import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum AuthStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
  PENDING_ACTIVATION = 'pending_activation',
}

export interface IBaseAuth extends Document {
  email: string;
  password: string;
  status: AuthStatus;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  lastLoginIP?: string;
  profileId: mongoose.Types.ObjectId;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isLocked(): boolean;
}

const BaseAuthSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(AuthStatus),
    default: AuthStatus.ACTIVE,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  lastLoginIP: {
    type: String,
  },
  profileId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  // We store a SHA-256 hash of the reset token, never the raw token itself.
  // If the database were ever exposed, a stored plaintext/raw token would let
  // an attacker reset any account's password directly.
  passwordResetTokenHash: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
}, {
  timestamps: true,
});

BaseAuthSchema.index({ status: 1 });
BaseAuthSchema.index({ profileId: 1 });

BaseAuthSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

BaseAuthSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

BaseAuthSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({ $unset: { lockUntil: 1, failedLoginAttempts: 1 } });
  }

  const updates: any = { $inc: { failedLoginAttempts: 1 } };

  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = {
      lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
    };
  }

  return this.updateOne(updates);
};

BaseAuthSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  return this.updateOne({ $unset: { failedLoginAttempts: 1, lockUntil: 1 } });
};

BaseAuthSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export { BaseAuthSchema };
