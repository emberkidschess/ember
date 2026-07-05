import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Attendance lifecycle:
 *
 *   NOT_MARKED -> PRESENT   (student clicked "Join Now" during the class window)
 *   NOT_MARKED -> ABSENT    (cron job runs at class end, no click was recorded)
 *   ABSENT     -> DISPUTED  (student raises a dispute: "I joined via the link
 *                            but forgot to click")
 *   DISPUTED   -> PRESENT   (coach reviews and approves the dispute - manual
 *                            override, package consumption is re-applied)
 *   DISPUTED   -> ABSENT    (coach reviews and rejects the dispute - stays absent)
 *
 * PRESENT can also be reached directly by a coach's manual override without
 * going through DISPUTED first (e.g. coach remembers the student was there
 * and corrects the record proactively).
 */
export enum AttendanceStatus {
  NOT_MARKED = 'not_marked',
  PRESENT = 'present',
  ABSENT = 'absent',
  DISPUTED = 'disputed',
}

export enum AttendanceSource {
  STUDENT_CLICK = 'student_click', // "Join Now" was clicked within the class window
  AUTO_ABSENT_CRON = 'auto_absent_cron', // backend job marked absent at class end
  COACH_OVERRIDE = 'coach_override', // coach manually corrected the status
  STUDENT_DISPUTE = 'student_dispute', // student raised a dispute (status -> DISPUTED)
}

export interface IAttendance extends Document {
  class: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  coach: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  // Undefined while status is NOT_MARKED (the record is just a placeholder
  // created when the Class was scheduled, awaiting a real transition).
  // Set the moment any transition actually occurs.
  source?: AttendanceSource;
  // Undefined while NOT_MARKED, for the same reason as source above.
  markedAt?: Date;
  joinClickedAt?: Date;
  notes?: string;
  markedBy?: mongoose.Types.ObjectId;
  attendanceConsumed: boolean;
  disputeReason?: string;
  disputeRaisedAt?: Date;
  disputeResolvedAt?: Date;
  disputeResolvedBy?: mongoose.Types.ObjectId;
  disputeApproved?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.NOT_MARKED,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(AttendanceSource),
      // Not required: stays unset while status is NOT_MARKED. Set on the
      // actual transition (click/cron/override/dispute).
    },
    markedAt: {
      type: Date,
    },
    joinClickedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    attendanceConsumed: {
      type: Boolean,
      default: false,
      required: true,
    },
    disputeReason: {
      type: String,
      trim: true,
    },
    disputeRaisedAt: {
      type: Date,
    },
    disputeResolvedAt: {
      type: Date,
    },
    disputeResolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    disputeApproved: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ student: 1, markedAt: -1 });
AttendanceSchema.index({ coach: 1, markedAt: -1 });
AttendanceSchema.index({ status: 1, createdAt: -1 });
AttendanceSchema.index({ class: 1, student: 1 }, { unique: true });

const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
