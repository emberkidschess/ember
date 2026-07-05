import mongoose, { Schema, Model } from 'mongoose';
import { IBaseAuth, BaseAuthSchema } from './BaseAuth';

export type IClientAuth = IBaseAuth;

const ClientAuthSchema = new Schema({
  ...BaseAuthSchema.obj,
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
}, {
  timestamps: true,
});

ClientAuthSchema.methods.comparePassword = BaseAuthSchema.methods.comparePassword;
ClientAuthSchema.methods.incrementLoginAttempts = BaseAuthSchema.methods.incrementLoginAttempts;
ClientAuthSchema.methods.resetLoginAttempts = BaseAuthSchema.methods.resetLoginAttempts;
ClientAuthSchema.methods.isLocked = BaseAuthSchema.methods.isLocked;

ClientAuthSchema.pre('save', async function(next) {
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

const ClientAuth: Model<IClientAuth> = mongoose.models.ClientAuth || mongoose.model<IClientAuth>('ClientAuth', ClientAuthSchema);

export default ClientAuth;
