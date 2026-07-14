import mongoose from 'mongoose';
import Student from '../models/Student';
import ClientAuth from '../models/ClientAuth';
import Lead from '../models/Lead';
import PaymentLink from '../models/PaymentLink';
import { AuthStatus } from '../models/BaseAuth';
import { LeadStatus } from '../models/Lead';
import { PaymentLinkStatus, PaymentLinkPurpose } from '../models/PaymentLink';

export interface StudentCreationResult {
  student: any;
  clientCredentials: { email: string; tempPassword: string } | null;
  isNewStudent: boolean;
}

/**
 * Creates or updates a Student record and their associated ClientAuth credentials.
 * 
 * This helper function handles two scenarios:
 * 1. New student enrollment from a Lead (creates Student from Lead data)
 * 2. Existing student (updates their portal status and credentials)
 * 
 * For both scenarios, it ensures the student has active ClientAuth credentials
 * for portal login, creating new credentials if needed or reactivating existing ones.
 * 
 * @param session - Mongoose transaction session
 * @param paymentLink - The payment link being activated
 * @param createdBy - User ID who is performing the activation
 * @returns Object containing the student, any credentials created, and whether this was a new student
 */
export const createOrUpdateStudentWithAuth = async (
  session: mongoose.ClientSession,
  paymentLink: any,
  createdBy: mongoose.Types.ObjectId
): Promise<StudentCreationResult> => {
  let student: any;
  let isNewStudent = false;

  // Scenario 1: New enrollment from Lead - create Student from Lead
  if (paymentLink.purpose === PaymentLinkPurpose.NEW_PACKAGE && !paymentLink.student) {
    if (!paymentLink.lead) {
      throw new Error('This payment link has neither a student nor a lead attached');
    }

    const lead = await Lead.findById(paymentLink.lead).session(session);
    if (!lead) {
      throw new Error('Lead not found');
    }
    if (lead.convertedToStudent) {
      throw new Error('This lead has already been converted to a student');
    }

    const duplicateStudent = await Student.findOne({ email: lead.email.toLowerCase() }).session(session);
    if (duplicateStudent) {
      throw new Error(
        'A student portal already uses this email. Use a unique student email or renew the existing student package.'
      );
    }

    // Check for duplicate payment links being processed
    const existingActivePaymentLink = await PaymentLink.findOne({
      lead: paymentLink.lead,
      status: { $in: [PaymentLinkStatus.WAITING_FOR_ACTIVATION] },
      _id: { $ne: paymentLink._id },
    }).session(session);

    if (existingActivePaymentLink) {
      throw new Error('Another payment link for this lead is already being processed. Please activate that one first.');
    }

    // Create new Student from Lead data
    const [newStudent] = await Student.create(
      [
        {
          studentName: lead.studentName,
          parentName: lead.parentName,
          phoneNumber: lead.phoneNumber,
          country: lead.country,
          email: lead.email,
          course: lead.courseInterest,
          enrollmentStatus: 'pending',
          studentStatus: 'active',
          createdBy,
          leadId: lead._id,
        },
      ],
      { session }
    );

    // Mark lead as converted
    await Lead.findByIdAndUpdate(
      lead._id,
      {
        convertedToStudent: true,
        status: LeadStatus.CONVERTED,
        studentId: newStudent._id,
        convertedBy: createdBy,
        convertedAt: new Date(),
      },
      { session }
    );

    // Update payment link to reference the new student
    paymentLink.student = newStudent._id;
    await paymentLink.save({ session });

    student = newStudent;
    isNewStudent = true;
  } else {
    // Scenario 2: Existing student (renewal/upgrade)
    student = await Student.findById(paymentLink.student).session(session);
    if (!student) {
      throw new Error('Student not found');
    }
  }

  // Ensure ClientAuth credentials exist and are active
  let clientCredentials: { email: string; tempPassword: string } | null = null;

  if (student && student.email) {
    const normalizedEmail = student.email.toLowerCase();
    const existingClientAuth = await ClientAuth.findOne({
      $or: [{ profileId: student._id }, { email: normalizedEmail }],
    }).session(session);

    if (existingClientAuth) {
      if (existingClientAuth.profileId.toString() !== student._id.toString()) {
        throw new Error('That email is already assigned to another student portal account');
      }

      existingClientAuth.email = normalizedEmail;
      // Reactivate if credentials exist but aren't active
      if (existingClientAuth.status !== AuthStatus.ACTIVE) {
        existingClientAuth.status = AuthStatus.ACTIVE;
      }
      if (existingClientAuth.isModified()) await existingClientAuth.save({ session });
    } else {
      // Create new credentials if none exist
      const crypto = await import('crypto');
      const tempPassword = crypto.randomBytes(9).toString('base64url');
      const [newClientAuth] = await ClientAuth.create(
        [
          {
            email: student.email.toLowerCase(),
            password: tempPassword,
            status: AuthStatus.ACTIVE,
            profileId: student._id,
          },
        ],
        { session }
      );

      if (newClientAuth) {
        clientCredentials = { email: student.email, tempPassword };
      }
    }
  }

  return {
    student,
    clientCredentials,
    isNewStudent,
  };
};
