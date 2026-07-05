import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

export interface IAdmin extends Document {
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  settings: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
  // Session management for global revocation
  sessionVersion?: number;
  // Audit trail references
  auditLogs?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: Object.values(AdminRole),
    default: AdminRole.ADMIN,
  },
  permissions: [{
    type: String,
  }],
  settings: {
    type: Schema.Types.Mixed,
    default: {},
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // Session management for global revocation
  sessionVersion: {
    type: Number,
    default: 1,
  },
  // Audit trail references
  auditLogs: [{
    type: Schema.Types.ObjectId,
    ref: 'AuditLog',
  }],
}, {
  timestamps: true,
});

AdminSchema.index({ email: 1 });
AdminSchema.index({ role: 1 });

const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
