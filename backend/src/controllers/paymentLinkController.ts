import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PaymentLink, { PaymentLinkStatus, PaymentLinkPurpose, PaymentMethod } from '../models/PaymentLink';
import Student, { EnrollmentStatus, PortalStatus, StudentStatus } from '../models/Student';
import Lead, { LeadStatus } from '../models/Lead';
import Package, { PackageStatus } from '../models/Package';
import Payment, { PaymentStatus } from '../models/Payment';
import Batch, { BatchStatus } from '../models/Batch';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import { AuthRequest } from '../middleware/auth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { validateStudent, validateLead } from '../utils/foreignKeys';
import { sendNotification } from '../utils/notificationProcessor';
import { NotificationType, NotificationChannel } from '../models/Notification';
import emailService from '../services/emailService';
import { buildAuditLogData } from '../middleware/auditLogger';
import wisePaymentService from '../services/wisePaymentService';
import whatsappService from '../services/whatsappService';
import { primaryFrontendUrl } from '../utils/frontendUrl';
import {
  COURSE_LEVELS,
  CourseLevel,
  EnrollmentRuleError,
  ensureBatchSessionPlan,
  normalizeCourseLevel,
  validateSessionPlan,
} from '../domain/courseEnrollment';
import {
  assertCourseEnrollmentCapacity,
  assertNoActiveOrQueuedPackage,
  assertPackageCanRenew,
  assertPackageCanUpgrade,
} from '../services/enrollmentLifecycleService';

type PaymentLinkShareChannel = 'email' | 'whatsapp' | 'copy_link';
type PaymentLinkDeliveryFailure = { channel: PaymentLinkShareChannel; error: string };

function sendPaymentLinkError(res: Response, error: unknown, fallback: string) {
  const isRuleError = error instanceof EnrollmentRuleError;
  return res.status(isRuleError ? 400 : 500).json({
    success: false,
    error: isRuleError ? error.message : fallback,
  });
}

const expireActivePaymentLinks = async () => {
  const now = new Date();
  await PaymentLink.updateMany(
    { status: PaymentLinkStatus.ACTIVE, expiresAt: { $lte: now } },
    { $set: { status: PaymentLinkStatus.EXPIRED, expiredAt: now } }
  );
};

const expirePaymentLinkIfNeeded = async (paymentLink: any, session?: mongoose.ClientSession) => {
  if (paymentLink.status === PaymentLinkStatus.ACTIVE && paymentLink.expiresAt <= new Date()) {
    paymentLink.status = PaymentLinkStatus.EXPIRED;
    paymentLink.expiredAt = new Date();
    await paymentLink.save(session ? { session } : undefined);
    return true;
  }

  return false;
};

function getCourseTransitionError(
  purpose: PaymentLinkPurpose,
  previousCourseLevel: string,
  targetCourseLevel: string
): string | null {
  const currentLevel = normalizeCourseLevel(previousCourseLevel);
  const targetLevel = normalizeCourseLevel(targetCourseLevel);
  if (purpose === PaymentLinkPurpose.RENEWAL) {
    return targetLevel === currentLevel ? null : 'A renewal must stay on the current course level';
  }
  if (purpose === PaymentLinkPurpose.UPGRADE) {
    const currentIndex = COURSE_LEVELS.indexOf(currentLevel);
    const expectedLevel = COURSE_LEVELS[currentIndex + 1];
    if (!expectedLevel) return `${currentLevel} is already the highest course level`;
    return targetLevel === expectedLevel
      ? null
      : `An upgrade from ${currentLevel} must move to ${expectedLevel}`;
  }
  return null;
}

const resolvePreviousPackage = async (
  studentId: string,
  providedPackageId?: string,
  session?: mongoose.ClientSession
) => {
  const student = await Student.findById(studentId).session(session || null);
  if (!student) {
    throw new Error('Student not found');
  }

  const packageId = providedPackageId || student.currentPackageId?.toString();
  if (packageId) {
    const packageData = await Package.findById(packageId).session(session || null);
    if (!packageData) {
      throw new Error('Previous package not found');
    }
    if (packageData.student.toString() !== studentId) {
      throw new Error('Previous package does not belong to this student');
    }
    return packageData;
  }

  const latestPackage = await Package.findOne({ student: studentId })
    .sort({ createdAt: -1 })
    .session(session || null);

  if (!latestPackage) {
    throw new Error('Student does not have a package to renew or upgrade');
  }

  return latestPackage;
};

/**
 * Manual-verification payment flow (no payment gateway):
 *
 *   1. Staff generates a payment link (createPaymentLink) - status ACTIVE.
 *   2. Staff shares it (sendPaymentLink) via email/whatsapp/copy_link, or
 *      shares the Wise instructions manually outside the system.
 *   3. Once the parent pays through Wise, staff manually
 *      confirms receipt (markPaymentReceivedManually) - status flips to
 *      WAITING_FOR_ACTIVATION and a Payment ledger record is created.
 *   4. Staff assigns coach/batch/schedule and activates (activatePackage) -
 *      this creates the Package, the Student (if new enrollment from a
 *      Lead), and the portal credentials - status ACTIVATED.
 */

/**
 * Public endpoint for payment link access (no authentication required).
 * Returns a strict DTO with only the fields needed to render a "how to pay"
 * page - Wise payment instructions, not a gateway checkout.
 */
export const getPaymentLinkPublic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await expireActivePaymentLinks();

    const paymentLink = await PaymentLink.findById(id);

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found or has been removed.',
      });
    }

    let studentName = 'Student';
    if (paymentLink.lead) {
      const lead = await Lead.findById(paymentLink.lead).select('studentName');
      if (lead) studentName = lead.studentName;
    } else if (paymentLink.student) {
      const student = await Student.findById(paymentLink.student).select('studentName');
      if (student) studentName = student.studentName;
    }

    const paymentInstructions = wisePaymentService.generatePaymentInstructions(
      paymentLink.amount,
      paymentLink.currency,
      studentName
    );
    const paymentDetails = wisePaymentService.getPaymentDetails();

    const publicDto = {
      id: paymentLink._id,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      packageType: paymentLink.packageType,
      courseLevel: paymentLink.courseLevel,
      status: paymentLink.status,
      paymentMethod: PaymentMethod.WISE,
      expiresAt: paymentLink.expiresAt,
      studentName,
      paymentInstructions,
      paymentDetails,
    };

    return res.status(200).json({ success: true, data: publicDto });
  } catch (error) {
    console.error('Error fetching public payment link:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPaymentLinks = async (req: AuthRequest, res: Response) => {
  try {
    await expireActivePaymentLinks();
    const { student, status, purpose } = req.query;

    const filter: any = {};

    if (student) filter.student = student;
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;

    const paymentLinks = await PaymentLink.find(filter)
      .populate('student', 'studentName parentName email phoneNumber')
      .populate('lead', 'studentName parentName email phoneNumber')
      .populate('previousPackageId', 'packageType courseLevel')
      .populate('createdBy', 'name email')
      .select('student lead amount currency status purpose packageType courseLevel previousPackageId paymentMethod shareableUrl sentVia sentAt paidAt activatedAt createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: paymentLinks,
    });
  } catch (error) {
    console.error('Error fetching payment links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment links',
    });
  }
};

export const getPendingActivations = async (req: AuthRequest, res: Response) => {
  try {
    await expireActivePaymentLinks();
    const paymentLinks = await PaymentLink.find({
      status: PaymentLinkStatus.WAITING_FOR_ACTIVATION,
    })
      .populate('student', 'studentName parentName email phoneNumber')
      .populate('lead', 'studentName parentName email phoneNumber')
      .populate('previousPackageId', 'packageType courseLevel')
      .populate('createdBy', 'name email')
      .select('student lead amount currency status purpose packageType courseLevel previousPackageId paymentMethod shareableUrl sentVia sentAt paidAt activatedAt createdAt')
      .sort({ paidAt: -1 });

    res.json({
      success: true,
      data: paymentLinks,
    });
  } catch (error) {
    console.error('Error fetching pending activations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending activations',
    });
  }
};

export const getPaymentLinkById = async (req: AuthRequest, res: Response) => {
  try {
    await expireActivePaymentLinks();
    const paymentLink = await PaymentLink.findById(req.params.id)
      .populate('student', 'studentName parentName email phoneNumber')
      .populate('lead', 'studentName parentName email phoneNumber')
      .populate('previousPackageId', 'packageType courseLevel')
      .populate('createdBy', 'name email');

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        error: 'Payment link not found',
      });
    }

    res.json({
      success: true,
      data: paymentLink,
    });
  } catch (error) {
    console.error('Error fetching payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment link',
    });
  }
};

export const createPaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    await expireActivePaymentLinks();
    const { purpose, lead: leadId, student: studentId } = req.body;

    // New enrollments originate from a Lead (the Student doesn't exist yet -
    // it's created at activation time, once payment is confirmed). Renewals
    // and upgrades always reference an existing Student.
    if (purpose === PaymentLinkPurpose.NEW_PACKAGE) {
      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'A lead is required to generate a new enrollment payment link',
        });
      }
      await validateLead(leadId);

      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
      if (lead.convertedToStudent) {
        return res.status(400).json({
          success: false,
          error: 'This lead has already been converted to a student',
        });
      }
      if (!req.body.packageType || !req.body.courseLevel) {
        return res.status(400).json({
          success: false,
          error: 'packageType and courseLevel are required for new package',
        });
      }
      validateSessionPlan(req.body.courseLevel, req.body.packageType);

      const existingLink = await PaymentLink.findOne({
        lead: leadId,
        status: { $in: [PaymentLinkStatus.ACTIVE, PaymentLinkStatus.WAITING_FOR_ACTIVATION] },
      });
      if (existingLink) {
        return res.status(400).json({
          success: false,
          error: 'An active payment link already exists for this lead',
        });
      }
    } else {
      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'A student is required for renewal/upgrade payment links',
        });
      }
      await validateStudent(studentId);

      const existingLink = await PaymentLink.findOne({
        student: studentId,
        status: { $in: [PaymentLinkStatus.ACTIVE, PaymentLinkStatus.WAITING_FOR_ACTIVATION] },
      });
      if (existingLink) {
        return res.status(400).json({
          success: false,
          error: 'An active payment link already exists for this student',
        });
      }

      if (purpose === PaymentLinkPurpose.RENEWAL || purpose === PaymentLinkPurpose.UPGRADE) {
        if (purpose === PaymentLinkPurpose.UPGRADE && !req.body.courseLevel) {
          return res.status(400).json({
            success: false,
            error: 'courseLevel is required for upgrade',
          });
        }

        const previousPackage = await resolvePreviousPackage(studentId, req.body.previousPackageId);
        if (purpose === PaymentLinkPurpose.RENEWAL) {
          assertPackageCanRenew(previousPackage);
        } else {
          assertPackageCanUpgrade(previousPackage);
        }
        req.body.previousPackageId = previousPackage._id;
        req.body.packageType = req.body.packageType || previousPackage.packageType;
        req.body.courseLevel = normalizeCourseLevel(req.body.courseLevel || previousPackage.courseLevel);
        const transitionError = getCourseTransitionError(
          purpose,
          previousPackage.courseLevel,
          req.body.courseLevel
        );
        if (transitionError) {
          return res.status(400).json({ success: false, error: transitionError });
        }
        const plan = validateSessionPlan(req.body.courseLevel, req.body.packageType);
        await assertCourseEnrollmentCapacity(
          studentId,
          plan.courseLevel,
          plan.sessions
        );
      }
    }

    // Resolve a single "contact" shape regardless of whether we're working
    // from a Lead or a Student, for the response payload below.
    let contact: { name: string; email: string; phone: string };
    if (purpose === PaymentLinkPurpose.NEW_PACKAGE) {
      const lead = await Lead.findById(leadId);
      contact = { name: lead!.parentName, email: lead!.email, phone: lead!.phoneNumber };
    } else {
      const student = await Student.findById(studentId);
      contact = { name: student!.parentName, email: student!.email, phone: student!.phoneNumber };
    }

    // Create first to get an _id, then set the shareableUrl to a stable
    // deep link the staff can copy/share manually (payment instructions
    // page, not a gateway checkout).
    const paymentLink = await PaymentLink.create({
      ...req.body,
      student: purpose === PaymentLinkPurpose.NEW_PACKAGE ? undefined : studentId,
      lead: purpose === PaymentLinkPurpose.NEW_PACKAGE ? leadId : undefined,
      paymentMethod: PaymentMethod.WISE,
      shareableUrl: 'pending',
      createdBy: req.user?.userId,
    });

    paymentLink.shareableUrl = `${primaryFrontendUrl()}/pay/${paymentLink._id}`;
    await paymentLink.save();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PAYMENT_LINK,
      entityId: paymentLink._id,
      entityName: `Payment link for ${purpose}`,
      success: true,
    }));

    res.status(201).json({
      success: true,
      data: { ...paymentLink.toObject(), contact },
      message: 'Payment link created successfully',
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    sendPaymentLinkError(res, error, 'Failed to create payment link');
  }
};

/**
 * Marks a payment link as sent to the parent/guardian via the requested
 * channel(s) - email or just a copy-link action the staff member performed
 * themselves. "Generate" and "Send" are deliberately separate
 * actions/permissions: a link can be generated and then shared by whichever
 * means is most convenient (and re-shared later), without re-generating it.
 */
export const sendPaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    const { channels } = req.body as { channels: PaymentLinkShareChannel[] };

    const paymentLink = await PaymentLink.findById(req.params.id);
    if (!paymentLink) {
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }
    if (await expirePaymentLinkIfNeeded(paymentLink)) {
      return res.status(400).json({ success: false, error: 'This payment link has expired' });
    }
    if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
      return res.status(400).json({ success: false, error: `Cannot send payment link with status ${paymentLink.status}` });
    }

    let contact: { name: string; email: string; phone: string };
    let studentName: string;
    if (paymentLink.lead) {
      const lead = await Lead.findById(paymentLink.lead);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
      contact = { name: lead.parentName, email: lead.email, phone: lead.phoneNumber };
      studentName = lead.studentName;
    } else {
      const student = await Student.findById(paymentLink.student);
      if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
      contact = { name: student.parentName, email: student.email, phone: student.phoneNumber };
      studentName = student.studentName;
    }

    const paymentUrl = paymentLink.shareableUrl || `${primaryFrontendUrl()}/pay/${paymentLink._id}`;

    const paymentInstructions = wisePaymentService.generatePaymentInstructions(
      paymentLink.amount,
      paymentLink.currency,
      studentName
    );

    const templateData = {
      parentName: contact.name,
      studentName,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      packageType: paymentLink.packageType,
      paymentUrl,
      paymentMethod: PaymentMethod.WISE,
      paymentInstructions,
      paymentDetails: wisePaymentService.getPaymentDetails(),
    };

    const deliveredChannels: PaymentLinkShareChannel[] = [];
    const failedDeliveries: PaymentLinkDeliveryFailure[] = [];

    if (channels.includes('copy_link')) {
      deliveredChannels.push('copy_link');
    }

    if (channels.includes('email')) {
      try {
        await emailService.sendTemplatedEmail(contact.email, 'payment_link_sent', templateData);
        deliveredChannels.push('email');
      } catch (emailError) {
        console.error('Payment link email delivery failed:', emailError);
        failedDeliveries.push({
          channel: 'email',
          error: emailError instanceof Error ? emailError.message : 'Email delivery failed',
        });
      }
    }

    if (channels.includes('whatsapp')) {
      try {
        await whatsappService.sendMessage(
          contact.phone,
          [
            `Chess Academy payment link for ${studentName}`,
            `${paymentLink.currency} ${paymentLink.amount} · ${paymentLink.packageType || 'Chess package'}`,
            paymentInstructions,
            `View payment details: ${paymentUrl}`,
          ].filter(Boolean).join('\n\n')
        );
        deliveredChannels.push('whatsapp');
      } catch (whatsappError) {
        console.error('Payment link WhatsApp delivery failed:', whatsappError);
        failedDeliveries.push({
          channel: 'whatsapp',
          error: whatsappError instanceof Error ? whatsappError.message : 'WhatsApp delivery failed',
        });
      }
    }

    if (deliveredChannels.length === 0) {
      await AuditLog.create(buildAuditLogData(req, {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PAYMENT_LINK,
        entityId: paymentLink._id,
        entityName: `Payment link delivery failed via ${channels.join(', ')}`,
        details: { channels, deliveredChannels, failedDeliveries },
        success: false,
      }));

      return res.status(502).json({
        success: false,
        error: failedDeliveries[0]?.error || 'Could not share the payment link',
        deliveryResults: { deliveredChannels, failedDeliveries },
      });
    }

    paymentLink.sentVia = Array.from(new Set([...(paymentLink.sentVia || []), ...deliveredChannels]));
    paymentLink.sentAt = new Date();
    await paymentLink.save();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PAYMENT_LINK,
      entityId: paymentLink._id,
      entityName: `Payment link sent via ${deliveredChannels.join(', ')}`,
      details: { channels, deliveredChannels, failedDeliveries },
      success: true,
    }));

    const message =
      failedDeliveries.length > 0
        ? `Payment link shared via ${deliveredChannels.join(', ')}. ${failedDeliveries.map((item) => `${item.channel}: ${item.error}`).join(' ')}`
        : 'Payment link shared successfully';

    res.json({
      success: true,
      data: paymentLink,
      message,
      deliveryResults: { deliveredChannels, failedDeliveries },
    });
  } catch (error) {
    console.error('Error sending payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send payment link',
    });
  }
};

/**
 * Staff manually confirms a Wise payment link as paid after checking receipt.
 * Creates the single financial ledger record (Payment) and advances the
 * link to WAITING_FOR_ACTIVATION, ready for activatePackage.
 */
export const markPaymentReceivedManually = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reference } = req.body as { paymentMethod?: PaymentMethod; reference?: string };
    const paymentMethod = PaymentMethod.WISE;

    const paymentLink = await PaymentLink.findById(req.params.id).session(session);
    if (!paymentLink) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Payment link not found' });
    }
    if (await expirePaymentLinkIfNeeded(paymentLink, session)) {
      // Keep the explicit expiry transition. Aborting would roll it back and
      // leave the stale link active for the next request.
      await session.commitTransaction();
      return res.status(400).json({
        success: false,
        error: 'This payment link has expired and cannot be marked as paid',
      });
    }
    if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: `Cannot mark this link as paid - current status is ${paymentLink.status}`,
      });
    }
    const packageType = paymentLink.packageType || '10 Sessions';
    const courseLevel = paymentLink.courseLevel || 'Beginner';

    paymentLink.status = PaymentLinkStatus.WAITING_FOR_ACTIVATION;
    paymentLink.paidAt = new Date();
    paymentLink.paymentMethod = paymentMethod;
    paymentLink.manualPaymentReference = reference;
    paymentLink.verifiedBy = req.user?.userId as any;
    await paymentLink.save({ session });

    const payment = await Payment.create([{
      student: paymentLink.student,
      lead: paymentLink.lead,
      paymentLink: paymentLink._id,
      packageType,
      courseLevel,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      status: PaymentStatus.PAID,
      paymentMethod,
      manualPaymentReference: reference,
      paymentDate: new Date(),
      verifiedBy: req.user?.userId,
      notes: `Payment via Wise${reference ? ` - Ref: ${reference}` : ''}`,
      createdBy: req.user?.userId,
    }], { session });

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PAYMENT_LINK,
      entityId: paymentLink._id,
      entityName: `Manual payment confirmation (${paymentMethod})`,
      details: { paymentMethod, reference, paymentId: payment[0]._id },
      success: true,
    })], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      data: { paymentLink, payment: payment[0] },
      message: 'Payment marked as received. You can now enroll the student.',
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error marking payment as received:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark payment as received',
    });
  } finally {
    await session.endSession();
  }
};

export const updatePaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    const paymentLink = await PaymentLink.findById(req.params.id);

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        error: 'Payment link not found',
      });
    }

    if (await expirePaymentLinkIfNeeded(paymentLink)) {
      return res.status(400).json({
        success: false,
        error: 'Expired payment links cannot be edited',
      });
    }

    if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
      return res.status(400).json({
        success: false,
        error: 'Only active, unpaid payment links can be edited',
      });
    }

    const allowedFields = ['amount', 'currency', 'packageType', 'courseLevel', 'notes'] as const;
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (paymentLink as any)[field] = req.body[field];
      }
    }

    if (paymentLink.packageType || paymentLink.courseLevel) {
      if (!paymentLink.packageType || !paymentLink.courseLevel) {
        return res.status(400).json({
          success: false,
          error: 'Both session plan and course level are required',
        });
      }
      const plan = validateSessionPlan(paymentLink.courseLevel, paymentLink.packageType);
      paymentLink.courseLevel = plan.courseLevel;
      paymentLink.packageType = plan.packageType;

      if (paymentLink.purpose !== PaymentLinkPurpose.NEW_PACKAGE) {
        if (!paymentLink.student) {
          return res.status(400).json({ success: false, error: 'Student is required for this payment link' });
        }
        const previousPackage = await resolvePreviousPackage(
          paymentLink.student.toString(),
          paymentLink.previousPackageId?.toString()
        );
        if (paymentLink.purpose === PaymentLinkPurpose.RENEWAL) {
          assertPackageCanRenew(previousPackage);
        } else if (paymentLink.purpose === PaymentLinkPurpose.UPGRADE) {
          assertPackageCanUpgrade(previousPackage);
        }
        const transitionError = getCourseTransitionError(
          paymentLink.purpose,
          previousPackage.courseLevel,
          plan.courseLevel
        );
        if (transitionError) {
          return res.status(400).json({ success: false, error: transitionError });
        }
        await assertCourseEnrollmentCapacity(
          paymentLink.student,
          plan.courseLevel,
          plan.sessions
        );
      }
    }

    await paymentLink.save();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PAYMENT_LINK,
      entityId: paymentLink._id,
      entityName: `Payment link`,
      details: Object.fromEntries(
        allowedFields
          .filter((field) => req.body[field] !== undefined)
          .map((field) => [field, req.body[field]])
      ),
      success: true,
    }));

    res.json({
      success: true,
      data: paymentLink,
      message: 'Payment link updated successfully',
    });
  } catch (error) {
    console.error('Error updating payment link:', error);
    sendPaymentLinkError(res, error, 'Failed to update payment link');
  }
};

export const deletePaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    const paymentLink = await PaymentLink.findById(req.params.id);

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        error: 'Payment link not found',
      });
    }

    if (
      paymentLink.status === PaymentLinkStatus.WAITING_FOR_ACTIVATION ||
      paymentLink.status === PaymentLinkStatus.ACTIVATED
    ) {
      return res.status(400).json({
        success: false,
        error: 'Paid payment links are financial records and cannot be deleted',
      });
    }

    await paymentLink.deleteOne();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PAYMENT_LINK,
      entityId: paymentLink._id,
      entityName: `Payment link`,
      success: true,
    }));

    res.json({
      success: true,
      message: 'Payment link deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment link',
    });
  }
};

export const cancelPaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    const paymentLink = await PaymentLink.findById(req.params.id);

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        error: 'Payment link not found',
      });
    }

    // Only ACTIVE links (not yet paid) can be cancelled. Paid links
    // (WAITING_FOR_ACTIVATION, ACTIVATED) cannot be cancelled - they're
    // real financial records at that point.
    if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
      return res.status(400).json({
        success: false,
        error: 'Only ACTIVE payment links can be cancelled. Paid links cannot be cancelled.',
      });
    }

    await PaymentLink.findByIdAndUpdate(req.params.id, {
      status: PaymentLinkStatus.CANCELLED,
      cancelledBy: req.user?.userId,
      cancelledAt: new Date(),
    });

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PAYMENT_LINK,
      entityId: paymentLink._id,
      entityName: `Payment link cancellation`,
      details: { previousStatus: paymentLink.status },
      success: true,
    }));

    res.json({
      success: true,
      message: 'Payment link cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel payment link',
    });
  }
};

/**
 * Final step of the enrollment/renewal/upgrade flow: staff assigns a coach,
 * batch, and schedule. This creates the Package (and, for new enrollments,
 * the Student itself from the Lead), the financial ledger entry's package
 * link, and the student portal credentials - then sends the welcome email.
 */
export const activatePackage = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentLinkId } = req.params;
    const { assignedCoach, batch, schedule, timezone } = req.body;

    if (!assignedCoach || !batch || !schedule) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'assignedCoach, batch, and schedule are required for activation',
      });
    }

    const paymentLink = await PaymentLink.findById(paymentLinkId).session(session);
    if (!paymentLink) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Payment link not found',
      });
    }

    if (paymentLink.status !== PaymentLinkStatus.WAITING_FOR_ACTIVATION) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Payment link must be paid (waiting for activation) before it can be activated',
      });
    }

    const coach = await Staff.findOne({
      _id: assignedCoach,
      role: StaffRole.COACH,
      status: StaffStatus.ACTIVE,
    }).session(session);
    if (!coach) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Assigned coach must be an active coach',
      });
    }

    const batchDoc = await Batch.findById(batch).session(session);
    if (!batchDoc) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }
    if (batchDoc.status === BatchStatus.COMPLETED) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Cannot activate a student into a completed batch',
      });
    }
    ensureBatchSessionPlan(batchDoc);
    if (batchDoc.coach.toString() !== assignedCoach) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Selected coach must match the batch coach',
      });
    }
    await batchDoc.save({ session });

    // Create or update student and their portal credentials.
    const { createOrUpdateStudentWithAuth } = await import('../services/studentService');
    const { clientCredentials } = await createOrUpdateStudentWithAuth(
      session,
      paymentLink,
      req.user?.userId as any
    );

    let previousPackage: any = null;
    let packageType = paymentLink.packageType || '10 Sessions';
    let courseLevel = paymentLink.courseLevel;

    if (!paymentLink.student) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        error: 'Student was not attached to payment link during activation',
      });
    }

    if (paymentLink.purpose !== PaymentLinkPurpose.NEW_PACKAGE) {
      previousPackage = await resolvePreviousPackage(
        paymentLink.student.toString(),
        paymentLink.previousPackageId?.toString(),
        session
      );
      if (previousPackage.nextPackageId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'A renewal or upgrade is already linked to this package.',
        });
      }
      if (paymentLink.purpose === PaymentLinkPurpose.RENEWAL) {
        assertPackageCanRenew(previousPackage);
      } else if (paymentLink.purpose === PaymentLinkPurpose.UPGRADE) {
        assertPackageCanUpgrade(previousPackage);
        const activeStudent = await Student.findOne({
          _id: paymentLink.student,
          currentPackageId: previousPackage._id,
        }).session(session);
        if (!activeStudent) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            error: "This package is not the student's current active package.",
          });
        }
      }

      await assertNoActiveOrQueuedPackage(paymentLink.student, session, previousPackage._id);
    } else {
      await assertNoActiveOrQueuedPackage(paymentLink.student, session);
    }

    if (paymentLink.purpose !== PaymentLinkPurpose.NEW_PACKAGE) {
      packageType = paymentLink.packageType || previousPackage.packageType;
      courseLevel = paymentLink.purpose === PaymentLinkPurpose.UPGRADE
        ? paymentLink.courseLevel
        : normalizeCourseLevel(previousPackage.courseLevel);

      const transitionError = getCourseTransitionError(
        paymentLink.purpose,
        previousPackage.courseLevel,
        courseLevel || previousPackage.courseLevel
      );
      if (transitionError) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, error: transitionError });
      }

      if (!paymentLink.previousPackageId) {
        paymentLink.previousPackageId = previousPackage._id;
      }
    }

    if (!courseLevel) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Course level is required to activate a package',
      });
    }
    const plan = validateSessionPlan(courseLevel, packageType);
    courseLevel = plan.courseLevel;
    packageType = plan.packageType;
    await assertCourseEnrollmentCapacity(
      paymentLink.student,
      plan.courseLevel,
      plan.sessions,
      session
    );
    if (batchDoc.courseLevel !== courseLevel) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: `Batch level ${batchDoc.courseLevel} does not match package level ${courseLevel}`,
      });
    }

    const queueRenewal =
      paymentLink.purpose === PaymentLinkPurpose.RENEWAL &&
      Boolean(previousPackage && previousPackage.remainingClasses > 0);
    const packageData = await Package.create([{
      student: paymentLink.student,
      packageType: plan.packageType,
      courseLevel: plan.courseLevel,
      totalClasses: plan.sessions,
      completedClasses: 0,
      remainingClasses: plan.sessions,
      regularClassesCompleted: 0,
      enrollmentDate: new Date(),
      status: queueRenewal ? PackageStatus.QUEUED : PackageStatus.ACTIVE,
      previousPackageId: previousPackage?._id,
      activatedBy: req.user?.userId,
      activatedAt: queueRenewal ? undefined : new Date(),
    }], { session });

    if (previousPackage) {
      const previousPackageStatus =
        paymentLink.purpose === PaymentLinkPurpose.UPGRADE
          ? PackageStatus.UPGRADED
          : queueRenewal
            ? null
            : PackageStatus.COMPLETED;
      await Package.findByIdAndUpdate(
        previousPackage._id,
        previousPackageStatus
          ? {
              $set: { status: previousPackageStatus, nextPackageId: packageData[0]._id },
              $push: { statusHistory: { status: previousPackageStatus, changedAt: new Date() } },
            }
          : { $set: { nextPackageId: packageData[0]._id } },
        { session }
      );
    }

    if (!packageData || packageData.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        error: 'Failed to create package',
      });
    }

    const newPackageId = packageData[0]._id;

    // Attach the new Package to the existing Payment ledger record for this
    // link, rather than creating a second financial record - one payment,
    // one package, one record.
    const payment = await Payment.findOneAndUpdate(
      { paymentLink: paymentLink._id },
      {
        student: paymentLink.student,
        package: newPackageId,
        packageType,
        courseLevel,
      },
      { session, new: true }
    );

    if (!payment) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        error: 'The payment ledger entry is missing. Mark the payment as received before activation.',
      });
    }

    await Batch.findByIdAndUpdate(batchDoc._id, {
      $addToSet: { students: paymentLink.student },
      $set: {
        schedule,
        timezone: timezone || batchDoc.timezone || 'America/New_York',
        ...(batchDoc.status === BatchStatus.UPCOMING ? { status: BatchStatus.ONGOING } : {}),
      },
    }, { session, runValidators: true });

    // Queued renewals remain behind the currently active plan and are
    // switched on atomically when its final session is consumed.
    const studentBeforePackageActivation = await Student.findById(paymentLink.student).session(session);
    const restoreExpiredPortal =
      !queueRenewal &&
      (!studentBeforePackageActivation || studentBeforePackageActivation.portalStatus === PortalStatus.EXPIRED);

    const finalStudent = await Student.findByIdAndUpdate(
      paymentLink.student,
      {
        $set: {
          ...(!queueRenewal ? { currentPackageId: newPackageId } : {}),
          currentBatchId: batchDoc._id,
          enrollmentStatus: EnrollmentStatus.ENROLLED,
          studentStatus: StudentStatus.ACTIVE,
          assignedStaff: assignedCoach,
          timezone: timezone || batchDoc.timezone || 'America/New_York',
          ...(restoreExpiredPortal ? { portalStatus: PortalStatus.ACTIVE } : {}),
          whatsappCommunityLink: batchDoc.whatsappCommunityLink,
          course: plan.courseLevel,
        },
        $addToSet: { packageHistory: newPackageId },
        ...(restoreExpiredPortal
          ? {
              $unset: {
                portalExpiryDate: '',
                expiredAt: '',
                frozenAt: '',
                frozenBy: '',
                frozenReason: '',
              },
            }
          : {}),
      },
      { session, new: true, runValidators: true }
    );

    const activatedLink = await PaymentLink.findOneAndUpdate({
      _id: paymentLinkId,
      status: PaymentLinkStatus.WAITING_FOR_ACTIVATION,
    }, {
      status: PaymentLinkStatus.ACTIVATED,
      packageType,
      courseLevel,
      previousPackageId: previousPackage?._id || paymentLink.previousPackageId,
      activatedAt: new Date(),
      activatedBy: req.user?.userId,
    }, { session, new: true });

    if (!activatedLink || !finalStudent) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        error: 'Activation state changed while processing. Please refresh and try again.',
      });
    }

    await session.commitTransaction();

    // Send welcome notification outside the transaction - email
    // failures should not roll back a successful activation.
    // Invoice handling is manual, so we skip invoice email.

    try {
      await sendNotification(
        finalStudent._id.toString(),
        NotificationType.PACKAGE_ACTIVATED,
        NotificationChannel.EMAIL,
        {
          subject: `Welcome to Chess Academy - Package Activated!`,
          body: `
            <h2>Welcome to Chess Academy!</h2>
            <p>Dear ${finalStudent.parentName},</p>
            <p>We're excited to inform you that ${finalStudent.studentName}'s package has been successfully activated!</p>
            <h3>Package Details:</h3>
            <ul>
              <li><strong>Package:</strong> ${packageType}</li>
              <li><strong>Level:</strong> ${courseLevel}</li>
              <li><strong>Amount:</strong> ${paymentLink.currency} ${paymentLink.amount}</li>
            </ul>
            <h3>Coach Information:</h3>
            <ul>
              <li><strong>Coach:</strong> ${coach.name}</li>
              <li><strong>Email:</strong> ${coach.email}</li>
            </ul>
            <h3>Schedule:</h3>
            <p><strong>Batch:</strong> ${batchDoc.name}</p>
            <p><strong>Timing:</strong> ${schedule}</p>
            <h3>Student Dashboard Access:</h3>
            <p>Your child can now access their student dashboard to view class schedules, attendance, and progress.</p>
            <p>Login URL: ${primaryFrontendUrl()}/student/login</p>
            <p>Email: ${finalStudent.email}</p>
            <p>If you have any questions, feel free to reach out to us.</p>
            <p>Best regards,<br>Chess Academy Team</p>
          `,
          data: {
            studentName: finalStudent.studentName,
            parentName: finalStudent.parentName,
            packageType,
            courseLevel,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
            coachName: coach.name,
            coachEmail: coach.email,
            batch: batchDoc.name,
            schedule,
            loginUrl: `${primaryFrontendUrl()}/student/login`,
            studentEmail: finalStudent.email,
          },
        },
      );

      if (paymentLink.purpose === PaymentLinkPurpose.UPGRADE) {
        await sendNotification(
          finalStudent._id.toString(),
          NotificationType.COURSE_UPGRADE_COMPLETED,
          NotificationChannel.EMAIL,
          {
            data: {
              studentName: finalStudent.studentName,
              courseLevel,
              packageType,
            },
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to send activation notification:', notificationError);
    }

    if (clientCredentials) {
      try {
        await emailService.sendTemplatedEmail(clientCredentials.email, 'credentials_created', {
          parentName: finalStudent?.parentName || 'Parent',
          studentName: finalStudent?.studentName || '',
          email: clientCredentials.email,
          tempPassword: clientCredentials.tempPassword,
          loginUrl: `${primaryFrontendUrl()}/student/login`,
        });
      } catch (credentialsEmailError) {
        console.error('Failed to send student account credentials email:', credentialsEmailError);
      }
    }

    try {
      await AuditLog.create(buildAuditLogData(req, {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PAYMENT_LINK,
        entityId: newPackageId,
        entityName: `Package activation for ${paymentLink.purpose}`,
        details: { assignedCoach, batch: batchDoc._id, batchName: batchDoc.name, schedule, packageType, courseLevel },
        success: true,
      }));
    } catch (auditError) {
      console.error('Failed to record activation audit event:', auditError);
    }

    res.json({
      success: true,
      data: {
        package: packageData[0],
        payment,
        student: finalStudent,
      },
      message: 'Package activated successfully',
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error activating package:', error);
    const message = error instanceof Error ? error.message : '';
    const isClientError =
      error instanceof EnrollmentRuleError ||
      message.includes('already') ||
      message.includes('not found') ||
      message.includes('does not belong') ||
      message.includes('does not have') ||
      message.includes('unique student email');
    res.status(isClientError ? 400 : 500).json({
      success: false,
      error: isClientError ? message : 'Failed to activate package',
    });
  } finally {
    await session.endSession();
  }
};

export const getPaymentLinkStats = async (req: AuthRequest, res: Response) => {
  try {
    await expireActivePaymentLinks();
    const total = await PaymentLink.countDocuments();
    const active = await PaymentLink.countDocuments({ status: PaymentLinkStatus.ACTIVE });
    const waitingForActivation = await PaymentLink.countDocuments({ status: PaymentLinkStatus.WAITING_FOR_ACTIVATION });
    const expired = await PaymentLink.countDocuments({ status: PaymentLinkStatus.EXPIRED });
    const activated = await PaymentLink.countDocuments({ status: PaymentLinkStatus.ACTIVATED });

    const revenueResult = await Payment.aggregate([
      { $match: { status: PaymentStatus.PAID } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } },
    ]);
    const totalRevenueByCurrency = Object.fromEntries(revenueResult.map((item) => [item._id, item.total]));

    const pendingRevenueResult = await PaymentLink.aggregate([
      { $match: { status: PaymentLinkStatus.ACTIVE } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } },
    ]);
    const pendingRevenueByCurrency = Object.fromEntries(
      pendingRevenueResult.map((item) => [item._id, item.total])
    );

    res.json({
      success: true,
      data: {
        total,
        active,
        waitingForActivation,
        expired,
        activated,
        totalRevenueByCurrency,
        pendingRevenueByCurrency,
      },
    });
  } catch (error) {
    console.error('Error fetching payment link stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment link statistics',
    });
  }
};
