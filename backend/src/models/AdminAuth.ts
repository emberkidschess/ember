import mongoose, { Schema, Model } from 'mongoose';
import { IBaseAuth, BaseAuthSchema } from './BaseAuth';

export type IAdminAuth = IBaseAuth;

const AdminAuthSchema = new Schema({
  ...BaseAuthSchema.obj,
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
}, {
  timestamps: true,
});

AdminAuthSchema.methods.comparePassword = BaseAuthSchema.methods.comparePassword;
AdminAuthSchema.methods.incrementLoginAttempts = BaseAuthSchema.methods.incrementLoginAttempts;
AdminAuthSchema.methods.resetLoginAttempts = BaseAuthSchema.methods.resetLoginAttempts;
AdminAuthSchema.methods.isLocked = BaseAuthSchema.methods.isLocked;

AdminAuthSchema.pre('save', async function(next) {
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

const AdminAuth: Model<IAdminAuth> = mongoose.models.AdminAuth || mongoose.model<IAdminAuth>('AdminAuth', AdminAuthSchema);

export default AdminAuth;
