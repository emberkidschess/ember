/**
 * Granular staff permissions.
 *
 * These are independent of StaffRole (coach/staff) - role still controls
 * which broad areas of the system a staff account can reach at all (see
 * requireCoachOrAdmin/requireStaffOrAdmin in middleware/auth.ts), while
 * permissions control which specific actions a given staff member is
 * allowed to perform within those areas.
 *
 * Admins (admin/super_admin) implicitly have every permission and are never
 * checked against this list - see requirePermission in middleware/auth.ts.
 */
export const STAFF_PERMISSIONS = [
  'view_leads',
  'edit_leads',
  'convert_lead_to_student',
  'view_students',
  'edit_students',
  'generate_payment_link',
  'send_payment_link',
  'mark_payment_received',
  'enroll_student',
  'upgrade_student_course',
  'schedule_classes',
  'create_edit_class',
  'assign_students_to_class',
  'assign_staff_to_class',
  'reschedule_class',
  'cancel_class',
  'create_report_card',
  'export_report_card',
  'view_payment_history',
  // Trial scheduling and post-trial evaluation
  'schedule_trial',
  'mark_trial_result',
  // Portal freeze/pause (account suspension for long leave) - distinct from
  // edit_students, since pausing billing/attendance is a higher-trust
  // action than editing contact details.
  'freeze_student_portal',
  // Attendance dispute review and manual override - coach-level trust
  // action that directly affects package consumption.
  'resolve_attendance_dispute',
  'override_attendance',
  // Class Notes Hub - coach posts homework/notes broadcast to the batch
  'post_class_notes',
  'manage_academy_events',
  'view_coach_reports',
  // Parent-Teacher Meeting scheduling
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const isValidPermission = (value: string): value is StaffPermission =>
  (STAFF_PERMISSIONS as readonly string[]).includes(value);
