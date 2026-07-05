import mongoose from 'mongoose';
import AppError from './AppError';

async function validateExists(Model: any, id: string, label: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label} ID: ${id}`, 400);
  }
  const doc = await Model.findById(id).lean();
  if (!doc) {
    throw new AppError(`${label} not found: ${id}`, 404);
  }
}

export async function validateStudent(id: string): Promise<void> {
  const Student = (await import('../models/Student')).default;
  await validateExists(Student, id, 'Student');
}

export async function validateStaff(id: string): Promise<void> {
  const Staff = (await import('../models/Staff')).default;
  await validateExists(Staff, id, 'Staff');
}

export async function validateBatch(id: string): Promise<void> {
  const Batch = (await import('../models/Batch')).default;
  await validateExists(Batch, id, 'Batch');
}

export async function validateClass(id: string): Promise<void> {
  const Class = (await import('../models/Class')).default;
  await validateExists(Class, id, 'Class');
}

export async function validateLead(id: string): Promise<void> {
  const Lead = (await import('../models/Lead')).default;
  await validateExists(Lead, id, 'Lead');
}

export async function validatePackage(id: string): Promise<void> {
  const Package = (await import('../models/Package')).default;
  await validateExists(Package, id, 'Package');
}
