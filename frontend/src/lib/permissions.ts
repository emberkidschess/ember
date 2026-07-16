export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  permissions: PermissionDef[];
}

// Mirrors backend/src/constants/permissions.ts - keep these in sync.
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "Leads",
    permissions: [
      { key: "view_leads", label: "View Leads" },
      { key: "edit_leads", label: "Edit Leads" },
      { key: "convert_lead_to_student", label: "Convert Lead to Student" },
    ],
  },
  {
    group: "Trials",
    permissions: [
      { key: "schedule_trial", label: "Schedule Trial Class" },
      { key: "mark_trial_result", label: "Mark Trial Result (Ready to Join / Not Ready)" },
    ],
  },
  {
    group: "Students",
    permissions: [
      { key: "view_students", label: "View Students" },
      { key: "edit_students", label: "Edit Students" },
      { key: "enroll_student", label: "Enroll Student" },
      { key: "upgrade_student_course", label: "Upgrade Student Course" },
      { key: "freeze_student_portal", label: "Pause / Resume Student Portal" },
    ],
  },
  {
    group: "Payments",
    permissions: [
      { key: "generate_payment_link", label: "Generate Payment Link" },
      { key: "send_payment_link", label: "Send Payment Link" },
      { key: "mark_payment_received", label: "Mark Payment as Received" },
      { key: "view_payment_history", label: "View Payment History" },
    ],
  },
  {
    group: "Classes",
    permissions: [
      { key: "schedule_classes", label: "Schedule Classes" },
      { key: "create_edit_class", label: "Create/Edit Class" },
      { key: "assign_students_to_class", label: "Assign Students to Class" },
      { key: "assign_staff_to_class", label: "Assign Staff to Class" },
      { key: "reschedule_class", label: "Reschedule Class" },
      { key: "cancel_class", label: "Cancel Class" },
      { key: "post_class_notes", label: "Post Class Notes / Homework" },
    ],
  },
  {
    group: "Attendance",
    permissions: [
      { key: "resolve_attendance_dispute", label: "Resolve Attendance Disputes" },
      { key: "override_attendance", label: "Manually Override Attendance" },
    ],
  },
  {
    group: "Report Cards",
    permissions: [
      { key: "create_report_card", label: "Create Report Card" },
      { key: "export_report_card", label: "Export Report Card" },
    ],
  },
  {
    group: "Academy Events & Reports",
    permissions: [
      { key: "manage_academy_events", label: "Manage Masterclasses & Tournaments" },
      { key: "view_coach_reports", label: "View Coach Reports" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
