import { Request, Response } from 'express';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import StaffAuth from '../models/StaffAuth';
import { AuthStatus } from '../models/BaseAuth';
import { AuthRequest } from '../middleware/auth';
import { StaffAuthService } from '../services/staffAuthService';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import crypto from 'crypto';
import { buildAuditLogData } from '../middleware/auditLogger';
import emailService from '../services/emailService';
import Batch from '../models/Batch';
import Class from '../models/Class';
import { CacheService, CacheNamespaces } from '../utils/cache';

export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.query;
    const filter: any = {};
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    // Non-admin staff need a safe coach picker for batch assignment and
    // report cards, but must not receive salaries or permission grants.
    if (!isAdmin && role !== StaffRole.COACH) {
      return res.status(403).json({
        success: false,
        error: 'Staff may only list active coach options',
      });
    }

    if (role === 'coach' || role === 'staff') {
      filter.role = role;
    }
    if (!isAdmin) {
      filter.status = StaffStatus.ACTIVE;
    }

    const staff = await Staff.find(filter)
      .select(isAdmin
        ? 'name email role status expertise permissions salaryPerClass defaultClassLink createdAt'
        : 'name email role status expertise defaultClassLink createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const staffData = staff.map((s: any) => ({
      _id: s._id.toString(),
      id: s._id.toString(),
      name: s.name,
      email: s.email,
      role: s.role,
      status: s.status,
      expertise: s.expertise || [],
      ...(isAdmin ? { permissions: s.permissions || [], salaryPerClass: s.salaryPerClass } : {}),
      defaultClassLink: s.defaultClassLink || '',
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      data: staffData,
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
    });
  }
};

export const getStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id }).lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const staffData = {
      ...staff,
      _id: staff._id.toString(),
      id: staff._id.toString(),
    };

    res.json({
      success: true,
      data: staffData,
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
    });
  }
};

export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, expertise, permissions, salaryPerClass, defaultClassLink } = req.body;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const existingStaffAuth = await StaffAuth.findOne({ email });
    if (existingStaffAuth) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    const tempPassword = password || crypto.randomBytes(12).toString('hex');
    const resolvedRole = role === 'coach' ? StaffRole.COACH : StaffRole.STAFF;

    const staff = await Staff.create({
      name,
      email,
      role: resolvedRole,
      status: StaffStatus.ACTIVE,
      expertise: Array.isArray(expertise) ? expertise : [],
      permissions: Array.isArray(permissions) ? permissions : [],
      salaryPerClass: typeof salaryPerClass === 'number' ? salaryPerClass : 0,
      defaultClassLink,
      createdBy: req.user?.userId,
    });

    const staffAuth = await StaffAuth.create({
      email,
      password: tempPassword,
      status: StaffStatus.ACTIVE,
      profileId: staff._id,
    });

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.STAFF_CREATED,
      entityType: AuditEntityType.STAFF,
      entityId: staff._id,
      entityName: staff.name,
      success: true,
    }));

    try {
      await emailService.sendTemplatedEmail(staff.email, 'staff_credentials_created', {
        name: staff.name,
        email: staff.email,
        roleLabel: staff.role === StaffRole.COACH ? 'Coach' : 'Staff',
        tempPassword,
      });
    } catch (emailError) {
      console.error('Failed to send staff credentials email:', emailError);
    }

    res.status(201).json({
      success: true,
      data: {
        _id: staff._id.toString(),
        id: staff._id.toString(),
        email: staff.email,
        name: staff.name,
        role: staff.role,
        status: staff.status,
        expertise: staff.expertise,
        permissions: staff.permissions,
        defaultClassLink: staff.defaultClassLink,
        createdAt: staff.createdAt,
        lastLogin: staff.createdAt,
        tempPassword: !password ? tempPassword : undefined,
      },
      message: 'Staff created successfully',
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create staff',
    });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, status, expertise, salaryPerClass, permissions, defaultClassLink } = req.body;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const staff = await Staff.findOne({ _id: req.params.id });
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    if (email && email !== staff.email) {
      const existingStaffAuth = await StaffAuth.findOne({ email });
      if (existingStaffAuth) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
        });
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase().trim();
    if (role === StaffRole.COACH || role === StaffRole.STAFF) updates.role = role;
    if (status) updates.status = status;
    if (Array.isArray(expertise)) updates.expertise = expertise;
    if (typeof salaryPerClass === 'number') updates.salaryPerClass = salaryPerClass;
    if (Array.isArray(permissions)) updates.permissions = permissions;
    if (defaultClassLink !== undefined) updates.defaultClassLink = defaultClassLink;

    const permissionsChanged = Array.isArray(permissions)
      && JSON.stringify([...(staff.permissions || [])].sort()) !== JSON.stringify([...permissions].sort());
    const roleChanged = Boolean(updates.role && updates.role !== staff.role);
    const statusChanged = Boolean(status && status !== staff.status);
    const updateOperation: any = {};
    if (Object.keys(updates).length > 0) {
      updateOperation.$set = updates;
    }
    if (permissionsChanged || roleChanged || statusChanged) {
      updateOperation.$inc = { sessionVersion: 1 };
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
      req.params.id,
      updateOperation,
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    if (defaultClassLink !== undefined && defaultClassLink !== staff.defaultClassLink) {
      await Promise.all([
        Batch.updateMany(
          { coach: staff._id },
          { $set: { meetingLink: defaultClassLink } }
        ),
        Class.updateMany(
          { coach: staff._id, meetingLinkSource: 'batch', status: 'scheduled' },
          { $set: { meetingLink: defaultClassLink } }
        ),
        CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`),
      ]);
    }

    if (email && email !== staff.email) {
      await StaffAuth.findOneAndUpdate(
        { profileId: updatedStaff._id },
        { email: email.toLowerCase().trim() }
      );
    }
    if (statusChanged) {
      const staffAuth = await StaffAuth.findOne({ profileId: updatedStaff._id });
      if (staffAuth) {
        staffAuth.status = updatedStaff.status === StaffStatus.ACTIVE ? AuthStatus.ACTIVE : AuthStatus.INACTIVE;
        await staffAuth.save();
        if (updatedStaff.status === StaffStatus.INACTIVE) {
          await StaffAuthService.revokeAllTokens(staffAuth._id.toString());
        }
      }
    }

    const staffData = {
      ...updatedStaff.toObject(),
      _id: updatedStaff._id.toString(),
      id: updatedStaff._id.toString(),
    };

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.STAFF,
      entityId: staff._id,
      entityName: staff.name,
      details: updates,
      success: true,
    }));

    res.json({
      success: true,
      data: staffData,
      message: 'Staff updated successfully',
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff',
    });
  }
};

export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const staff = await Staff.findOne({ _id: req.params.id });
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const [batchCount, classCount, studentCount, reportCount] = await Promise.all([
      (await import('../models/Batch')).default.countDocuments({ coach: staff._id }),
      (await import('../models/Class')).default.countDocuments({ coach: staff._id }),
      (await import('../models/Student')).default.countDocuments({ assignedStaff: staff._id }),
      (await import('../models/EvaluationReport')).default.countDocuments({ coach: staff._id }),
    ]);
    if (batchCount + classCount + studentCount + reportCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Staff with assigned students or academic history cannot be deleted. Set the account to inactive instead.',
      });
    }

    const staffAuth = await StaffAuth.findOne({ profileId: staff._id });
    if (staffAuth) {
      await StaffAuthService.revokeAllTokens(staffAuth._id.toString());
      await staffAuth.deleteOne();
    }
    await Staff.findByIdAndDelete(req.params.id);

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.STAFF,
      entityId: staff._id,
      entityName: staff.name,
      success: true,
    }));

    res.json({
      success: true,
      message: 'Staff deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete staff',
    });
  }
};

export const resetStaffPassword = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const staff = await Staff.findOne({ _id: req.params.id });
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const tempPassword = crypto.randomBytes(12).toString('hex');

    const staffAuth = await StaffAuth.findOne({ profileId: staff._id });
    if (staffAuth) {
      staffAuth.password = tempPassword;
      await staffAuth.save();
      await StaffAuthService.revokeAllTokens(staffAuth._id.toString());
    }
    await Staff.findByIdAndUpdate(staff._id, { $inc: { sessionVersion: 1 } });

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.PASSWORD_RESET,
      entityType: AuditEntityType.STAFF,
      entityId: staff._id,
      entityName: staff.name,
      success: true,
    }));

    try {
      await emailService.sendTemplatedEmail(staff.email, 'staff_password_reset', {
        name: staff.name,
        email: staff.email,
        tempPassword,
      });
    } catch (emailError) {
      console.error('Failed to send staff password reset email:', emailError);
    }

    res.json({
      success: true,
      data: { tempPassword },
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
};

export const toggleStaffStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const staff = await Staff.findOne({ _id: req.params.id });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    staff.status = status;
    await staff.save();

    const staffAuth = await StaffAuth.findOne({ profileId: staff._id });
    if (staffAuth) {
      staffAuth.status = status;
      await staffAuth.save();
    }

    if (status === StaffStatus.INACTIVE) {
      if (staffAuth) {
        await StaffAuthService.revokeAllTokens(staffAuth._id.toString());
      }
      staff.sessionVersion = (staff.sessionVersion || 1) + 1;
      await staff.save();
    }

    const action = status === StaffStatus.ACTIVE ? AuditAction.STAFF_ACTIVATED : AuditAction.STAFF_DEACTIVATED;
    await AuditLog.create(buildAuditLogData(req, {
      action,
      entityType: AuditEntityType.STAFF,
      entityId: staff._id,
      entityName: staff.name,
      details: { newStatus: status },
      success: true,
    }));

    const staffData = {
      _id: staff._id.toString(),
      id: staff._id.toString(),
      name: staff.name,
      email: staff.email,
      role: staff.role,
      status: staff.status,
      expertise: staff.expertise || [],
      permissions: staff.permissions || [],
      salaryPerClass: staff.salaryPerClass,
      defaultClassLink: staff.defaultClassLink,
      createdAt: staff.createdAt,
    };

    res.json({
      success: true,
      data: staffData,
      message: `Staff ${status === StaffStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling staff status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff status',
    });
  }
};

export const getStaffActivity = async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.params.id;

    const activity = await AuditLog.find({ staffId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Error fetching staff activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff activity',
    });
  }
};
