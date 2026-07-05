import { studentFetchJSON } from "./studentAuth";

export interface StudentReportItem {
  _id: string;
  title: string;
  strengths: string[];
  weaknesses: string[];
  tacticalSkills: number;
  openingKnowledge: number;
  endgameUnderstanding: number;
  coachNotes: string;
  recommendedNextLevel: string;
  publishedAt?: string;
  createdAt: string;
  coach?: { name: string; email?: string };
}

export interface StudentDashboardData {
  student: {
    id: string;
    studentName: string;
    parentName?: string;
    email?: string;
    phoneNumber?: string;
    country?: string;
    course: string;
    enrollmentStatus: string;
    enrollmentDate?: string;
    timezone?: string;
    whatsappCommunityLink?: string;
    portalStatus?: "active" | "frozen" | "expired";
    frozenReason?: string;
    frozenAt?: string;
  };
  currentPackage: {
    _id: string;
    packageType: string;
    courseLevel: string;
    status: string;
    totalClasses: number;
    completedClasses: number;
    remainingClasses: number;
    regularClassesCompleted?: number;
  } | null;
  currentBatch: {
    _id: string;
    name: string;
    courseLevel: string;
    status: string;
    totalSessions?: number;
    sessionsCompleted?: number;
    schedule?: string;
    timezone?: string;
    coach?: { name: string };
  } | null;
  packageHistory: {
    _id: string;
    packageType: string;
    courseLevel: string;
    status: string;
    totalClasses: number;
    completedClasses: number;
    remainingClasses: number;
    enrollmentDate: string;
  }[];
  upcomingClasses: {
    _id: string;
    course: string;
    classType: string;
    date: string;
    startTime: string;
    endTime: string;
    timezone?: string;
    hasMeetingLink: boolean;
    joinOpensAt: string;
    joinClosesAt: string;
    coach?: { name: string; email: string };
  }[];
  recentAttendance: {
    _id: string;
    status: string;
    markedAt: string;
    disputeReason?: string;
    class?: {
      course: string;
      date: string;
      startTime: string;
      endTime: string;
      classNotes?: string;
      classNotesPostedAt?: string;
    };
  }[];
  latestEvaluation: StudentReportItem | null;
  attendanceRate: number;
  pendingActivation: boolean;
}

export const getStudentDashboard = () =>
  studentFetchJSON<{ success: boolean; data: StudentDashboardData; error?: string }>("/students/dashboard");

export interface StudentClassItem {
  _id: string;
  course: string;
  classType: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  hasMeetingLink: boolean;
  joinOpensAt: string;
  joinClosesAt: string;
  status: string;
  classNotes?: string;
  classNotesPostedAt?: string;
  coach?: { name: string; email: string };
}

export const getMyClasses = () =>
  studentFetchJSON<{ success: boolean; data: StudentClassItem[]; error?: string }>("/classes/my");

export const getMyReports = () =>
  studentFetchJSON<{ success: boolean; data: StudentReportItem[]; error?: string }>("/evaluation-reports/my");

export const joinClass = (classId: string) =>
  studentFetchJSON<{
    success: boolean;
    data?: { meetingLink?: string };
    message?: string;
    error?: string;
  }>("/attendance/join", {
      method: "POST",
      body: JSON.stringify({ classId }),
    });

export const raiseAttendanceDispute = (attendanceId: string, disputeReason: string) =>
  studentFetchJSON<{ success: boolean; message?: string; error?: string }>(`/attendance/${attendanceId}/dispute`, {
    method: "POST",
    body: JSON.stringify({ disputeReason }),
  });

export const submitHelpRequest = (name: string, subject: string, topic: string, message: string) =>
  studentFetchJSON<{ success: boolean; message?: string; error?: string }>("/students/help-request", {
    method: "POST",
    body: JSON.stringify({ name, subject, topic, message }),
  });
