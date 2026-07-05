import mongoose, { Schema, Model } from 'mongoose';
import { IBaseAuth, BaseAuthSchema } from './BaseAuth';

export type IStaffAuth = IBaseAuth;

const StaffAuthSchema = new Schema({
  ...BaseAuthSchema.obj,
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
}, {
  timestamps: true,
});

StaffAuthSchema.methods.comparePassword = BaseAuthSchema.methods.comparePassword;
StaffAuthSchema.methods.incrementLoginAttempts = BaseAuthSchema.methods.incrementLoginAttempts;
StaffAuthSchema.methods.resetLoginAttempts = BaseAuthSchema.methods.resetLoginAttempts;
StaffAuthSchema.methods.isLocked = BaseAuthSchema.methods.isLocked;

StaffAuthSchema.pre('save', async function(next) {
  const doc = this as any;
  if (!doc.isModified('password')) return next();
  
  try {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(12);
    doc.password = await bcrypt.default.hash(doc.password as string, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

const StaffAuth: Model<IStaffAuth> = mongoose.models.StaffAuth || mongoose.model<IStaffAuth>('StaffAuth', StaffAuthSchema);

export default StaffAuth;
