"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock3,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Send,
  UserRound,
  Video,
  X,
} from "lucide-react";
import {
  getStudentDashboard,
  joinClass,
  raiseAttendanceDispute,
  submitHelpRequest,
  type StudentDashboardData,
} from "@/lib/studentApi";
import { logoutStudent, verifyStudentSession } from "@/lib/studentAuth";

// --- Design System Constants ---
const CARD_STYLES = {
  primary: "rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]",
  info: "rounded-xl border border-[#e8ecea] bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]",
  list: "rounded-xl border border-[#e8ecea] bg-white shadow-sm hover:shadow-md transition-all duration-200",
};

const BUTTON_STYLES = {
  primary: "rounded-xl bg-[#d96745] text-white hover:bg-[#b95032] transition-all duration-200 active:scale-95",
  secondary: "rounded-xl border border-[#d5ddd8] bg-white text-[#42514b] hover:bg-[#f1f4f2] transition-all duration-200 active:scale-95",
};

const BACKGROUND = "bg-gradient-to-br from-[#f8faf9] via-[#f3f6f4] to-[#eef1ef]";

type UpcomingClass = StudentDashboardData["upcomingClasses"][number];
type AttendanceItem = StudentDashboardData["recentAttendance"][number];
type Notice = { tone: "success" | "error" | "info"; message: string };

const navigation = [
  { id: "overview", href: "#overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", href: "#profile", label: "Profile", icon: UserRound },
  { id: "classes", href: "#classes", label: "Classes", icon: CalendarDays },
  { id: "attendance", href: "#attendance", label: "Attendance", icon: History },
  { id: "report", href: "#report", label: "Report", icon: FileText },
  { id: "help", href: "#help", label: "Help & Support", icon: HelpCircle },
];

function titleCase(value?: string) {
  if (!value) return "Not available";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatClassDate(date: string, weekday: "short" | "long" = "short") {
  return new Intl.DateTimeFormat(undefined, {
    weekday,
    month: "short",
    day: "numeric",
    year: weekday === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatDayNumber(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatMonth(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatReadableDate(date?: string) {
  if (!date) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatTime(time?: string) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
}

function formatTimeRange(startTime?: string, endTime?: string) {
  if (!startTime) return "Time to be confirmed";
  return `${formatTime(startTime)}${endTime ? ` - ${formatTime(endTime)}` : ""}`;
}

function formatTimeZone(isoDate: string, timeZone?: string) {
  if (!timeZone) return "";
  try {
    const part = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date(isoDate))
      .find((item) => item.type === "timeZoneName");
    return part?.value || timeZone;
  } catch {
    return timeZone;
  }
}

function formatDurationLabel(target: Date, now: Date | null) {
  if (!now) return "Checking time";
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getClassTimingStatus(classItem: UpcomingClass, now: Date | null) {
  if (!now) {
    return { label: "Checking time", helper: "Schedule sync in progress", tone: "neutral" as const };
  }

  const opensAt = new Date(classItem.joinOpensAt);
  const closesAt = new Date(classItem.joinClosesAt);
  if (now < opensAt) {
    return {
      label: `Opens in ${formatDurationLabel(opensAt, now)}`,
      helper: "Your join button activates at class time",
      tone: "waiting" as const,
    };
  }
  if (now <= closesAt) {
    return { label: "Live now", helper: "You can join this class", tone: "live" as const };
  }
  return { label: "Ended", helper: "This class window has closed", tone: "ended" as const };
}

function getJoinState(
  classItem: UpcomingClass,
  now: Date | null,
  portalLimited: boolean
) {
  if (portalLimited) {
    return { enabled: false, label: "Portal paused", helper: "Contact the academy to resume access." };
  }
  if (!classItem.hasMeetingLink) {
    return { enabled: false, label: "Link pending", helper: "Your coach has not added the meeting link yet." };
  }
  if (!now) {
    return { enabled: false, label: "Checking time", helper: "Checking the class start time." };
  }

  const opensAt = new Date(classItem.joinOpensAt);
  const closesAt = new Date(classItem.joinClosesAt);
  if (now < opensAt) {
    return {
      enabled: false,
      label: `Starts ${formatTime(classItem.startTime)}`,
      helper: "Join becomes available at the scheduled start time.",
    };
  }
  if (now > closesAt) {
    return { enabled: false, label: "Class ended", helper: "This class has already ended." };
  }
  return { enabled: true, label: "Join class", helper: "Mark attendance and open the meeting." };
}

// Removed unused getLearningFocus function

function StudentAvatar({
  src,
  name,
  large = false,
}: {
  src: string;
  name: string;
  large?: boolean;
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#f6efe8] shadow-[0_12px_28px_-20px_rgba(23,35,31,0.65)] ${
        large ? "h-20 w-20" : "h-20 w-20"
      }`}
    >
      <img src={src} alt={`${name} profile avatar`} className="h-full w-full object-cover" />
    </div>
  );
}

function ProgressMeter({
  label,
  completed,
  total,
  tone,
}: {
  label: string;
  completed: number;
  total: number;
  tone: "green" | "blue";
}) {
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const fillColor = tone === "green" ? "bg-[#e04a15]" : "bg-[#46799a]";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[#33433d]">{label}</span>
        <span className="shrink-0 font-semibold text-[#17231f]">
          {completed} / {total}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[#e7ece9]"
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-1.5 text-right text-xs text-[#68756f]">{percentage}% complete</p>
    </div>
  );
}

function JoinButton({
  classItem,
  now,
  portalLimited,
  joining,
  onJoin,
  compact = false,
}: {
  classItem: UpcomingClass;
  now: Date | null;
  portalLimited: boolean;
  joining: boolean;
  onJoin: (classItem: UpcomingClass) => void;
  compact?: boolean;
}) {
  const state = getJoinState(classItem, now, portalLimited);
  return (
    <button
      type="button"
      onClick={() => onJoin(classItem)}
      disabled={!state.enabled || joining}
      title={state.helper}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
        state.enabled
          ? "bg-[#d96745] text-white hover:bg-[#b95032] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d96745]"
          : "cursor-not-allowed border border-[#d9dfdc] bg-[#f0f3f1] text-[#77837e]"
      } ${compact ? "w-full sm:w-auto" : "w-full sm:w-auto sm:min-w-36"}`}
    >
      {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
      {joining ? "Opening class" : state.label}
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-dvh bg-[#f3f6f4]">
      <header className="h-16 border-b border-[#dde3df] bg-white">
        <div className="mx-auto flex h-full max-w-6xl items-center px-4 sm:px-6">
          <Image src="/icon-192.png" alt="" width={38} height={38} className="h-9 w-9" />
          <div className="ml-3">
            <p className="font-bold text-[#17231f]">EmberKids</p>
            <p className="text-xs text-[#75817c]">Student portal</p>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
          <div className="h-16 max-w-xl animate-pulse rounded-lg bg-[#e2e8e4]" />
          <div className="h-56 animate-pulse rounded-lg bg-[#dce4e0]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
            <div className="h-96 animate-pulse rounded-lg bg-white" />
            <div className="h-96 animate-pulse rounded-lg bg-white" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null);
  const [disputeAttendanceId, setDisputeAttendanceId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [helpForm, setHelpForm] = useState({ name: "", subject: "", topic: "", message: "" });
  const [submittingHelp, setSubmittingHelp] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      let redirecting = false;
      try {
        const validSession = await verifyStudentSession();
        if (!validSession) {
          redirecting = true;
          router.replace("/student/login");
          return;
        }

        const response = await getStudentDashboard();
        if (!response.success) {
          setError(response.error || "We could not load your dashboard.");
          return;
        }
        setDashboard(response.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not connect to the server. Please try again."
        );
      } finally {
        if (!redirecting) setLoading(false);
      }
    };

    void load();
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      const response = await getStudentDashboard();
      if (!response.success) {
        setNotice({ tone: "error", message: response.error || "Could not refresh the dashboard." });
        return;
      }
      setDashboard(response.data);
      setNow(new Date());
      setNotice({ tone: "success", message: "Dashboard is up to date." });
    } catch (refreshError) {
      setNotice({
        tone: "error",
        message: refreshError instanceof Error ? refreshError.message : "Could not refresh the dashboard.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutStudent();
    router.replace("/student/login");
  };

  const handleSectionChange = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJoinClass = async (classItem: UpcomingClass) => {
    setNotice(null);
    setJoiningClassId(classItem._id);

    let meetingWindow: Window | null = null;
    try {
      meetingWindow = window.open("about:blank", "_blank");
      if (meetingWindow) meetingWindow.opener = null;

      const response = await joinClass(classItem._id);
      const meetingLink = response.data?.meetingLink;
      if (!response.success || !meetingLink) {
        meetingWindow?.close();
        setNotice({
          tone: "error",
          message: response.error || "The meeting link is not available yet.",
        });
        return;
      }

      setNotice({
        tone: "success",
        message: response.message || "Attendance marked. Your class is opening now.",
      });

      if (meetingWindow) {
        meetingWindow.location.replace(meetingLink);
      } else {
        window.location.assign(meetingLink);
      }

      const refreshed = await getStudentDashboard();
      if (refreshed.success) setDashboard(refreshed.data);
    } catch (joinError) {
      meetingWindow?.close();
      setNotice({
        tone: "error",
        message: joinError instanceof Error ? joinError.message : "Could not join this class.",
      });
    } finally {
      setJoiningClassId(null);
    }
  };

  const handleDispute = async (attendanceId: string) => {
    const reason = disputeReason.trim();
    if (reason.length < 3) {
      setNotice({ tone: "error", message: "Please add a short reason before submitting." });
      return;
    }

    setNotice(null);
    setSubmittingDispute(true);
    try {
      const response = await raiseAttendanceDispute(attendanceId, reason);
      if (!response.success) {
        setNotice({ tone: "error", message: response.error || "Could not submit the dispute." });
        return;
      }

      setNotice({
        tone: "success",
        message: response.message || "Your attendance dispute was sent for review.",
      });
      setDisputeAttendanceId(null);
      setDisputeReason("");

      const refreshed = await getStudentDashboard();
      if (refreshed.success) setDashboard(refreshed.data);
    } catch (disputeError) {
      setNotice({
        tone: "error",
        message: disputeError instanceof Error ? disputeError.message : "Could not submit the dispute.",
      });
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleHelpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { name, subject, topic, message } = helpForm;

    if (!name.trim() || !subject || !topic || !message.trim()) {
      setNotice({ tone: "error", message: "Please fill in all fields." });
      return;
    }

    setNotice(null);
    setSubmittingHelp(true);
    try {
      const response = await submitHelpRequest(name.trim(), subject, topic, message.trim());
      if (!response.success) {
        setNotice({ tone: "error", message: response.error || "Could not submit help request." });
        return;
      }

      setNotice({
        tone: "success",
        message: response.message || "Your help request has been submitted successfully.",
      });
      setHelpForm({ name: "", subject: "", topic: "", message: "" });
    } catch (helpError) {
      setNotice({
        tone: "error",
        message: helpError instanceof Error ? helpError.message : "Could not submit help request.",
      });
    } finally {
      setSubmittingHelp(false);
    }
  };

  const upcomingClasses = dashboard?.upcomingClasses ?? [];
  const nextClass = !upcomingClasses.length
    ? null
    : !now
      ? upcomingClasses[0]
      : upcomingClasses.find((classItem) => new Date(classItem.joinClosesAt) >= now) ??
        upcomingClasses[0];
  const avatarSeed = dashboard?.student.email || dashboard?.student.studentName || "student";
  const avatarDataUri = useMemo(
    () =>
      createAvatar(adventurer, {
        seed: avatarSeed,
        backgroundColor: ["fff3dd", "e8f2ed", "edf6fb", "fde9e3", "f6efe8"],
        radius: 50,
      }).toDataUri(),
    [avatarSeed]
  );

  if (loading) return <DashboardSkeleton />;

  if (error || !dashboard) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f3f6f4] px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-[#dce3df] bg-white p-7 text-center shadow-[0_18px_50px_-38px_rgba(23,35,31,0.55)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fde9e3] text-[#b94f33]">
            <CircleAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-[#17231f]">Dashboard unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#68756f]">
            {error || "We could not load your student dashboard right now."}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-[#e04a15] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c73d0e]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-[#d7ded9] px-4 py-2.5 text-sm font-semibold text-[#33433d] hover:bg-[#f4f6f5]"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const {
    student,
    currentPackage,
    currentBatch,
    recentAttendance,
    latestEvaluation,
    attendanceRate,
  } = dashboard;
  const portalStatus = student.portalStatus || "active";
  const isPortalLimited = portalStatus === "frozen" || portalStatus === "expired";
  const regularCompleted =
    currentPackage?.regularClassesCompleted ?? currentPackage?.completedClasses ?? 0;
  const regularTotal = currentPackage?.totalClasses ?? 0;
  const batchSessionsText = currentBatch?.totalSessions
    ? `${currentBatch.sessionsCompleted ?? 0}/${currentBatch.totalSessions}`
    : "Not assigned";
  const visibleAttendance = showAllAttendance
    ? recentAttendance
    : recentAttendance.slice(0, 4);
  const firstName = student.studentName?.trim().split(/\s+/)[0] || "Student";
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const scoreRows = latestEvaluation
    ? [
        { label: "Tactical skills", value: latestEvaluation.tacticalSkills },
        { label: "Opening knowledge", value: latestEvaluation.openingKnowledge },
        { label: "Endgame", value: latestEvaluation.endgameUnderstanding },
      ]
    : [];
  const nextClassStatus = nextClass ? getClassTimingStatus(nextClass, now) : null;

  const noticeStyles = {
    success: "border-[#b8ddce] bg-[#eaf6f0] text-[#215c49]",
    error: "border-[#f1c6ba] bg-[#fff0ec] text-[#9d3e27]",
    info: "border-[#bdd5e4] bg-[#edf6fb] text-[#315f79]",
  };

  return (
    <div className={`min-h-dvh ${BACKGROUND} text-[#17231f]`}>
      <header className="sticky top-0 z-40 border-b border-[#dce3df] bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <Image src="/icon-192.png" alt="" width={34} height={34} className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#f85b1c]">Ember<span className="text-black">Kids</span></p>
              <p className="truncate text-[11px] text-[#75817c] uppercase tracking-[0.15em]">Student portal</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5ddd8] px-2.5 text-sm font-semibold text-[#42514b] hover:bg-[#f1f4f2] transition-all hover:shadow-sm sm:px-3"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#56635e] hover:bg-[#f0f3f1] disabled:opacity-50 transition-all"
            >
              {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="lg:flex lg:min-h-dvh">
        <aside className="hidden border-r border-[#dce3df] bg-[#fbfcfb] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-80 lg:shrink-0 lg:flex-col z-30">
          <div className="flex min-h-0 flex-1 flex-col p-5">
            <div className="flex items-center gap-1">
              <Image src="/icon-192.png" alt="" width={40} height={40} className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#f85b1c]">Ember<span className="text-black">Kids</span></p>
                <p className="truncate text-xs text-[#75817c] uppercase tracking-[0.15em]">Student portal</p>
              </div>
            </div>

            <nav className="mt-12 space-y-1" aria-label="Student dashboard">
              {navigation.map(({ id, href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(event) => handleSectionChange(event, id)}
                  className={`group relative flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                    activeSection === id
                      ? "bg-gradient-to-r from-[#e04a15] to-[#c73d0e] text-white shadow-lg shadow-[#e04a15]/20"
                      : "text-[#586660] hover:bg-[#f5e6e0] hover:text-[#17231f]"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200 ${
                      activeSection === id ? "bg-[#f0c76d]" : "bg-transparent"
                    }`}
                  />
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </a>
              ))}
            </nav>


            <div className="mt-auto space-y-4 pt-6">
              <Link
                href="/"
                className={`${BUTTON_STYLES.secondary} flex h-12 items-center justify-center gap-2`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f5e6e0] to-[#edd8d0] text-sm font-semibold text-[#e04a15] hover:from-[#edd8d0] hover:to-[#e5cfc4] disabled:opacity-50 transition-all duration-200 active:scale-95"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f1f3f2] to-[#e8ecea] text-sm font-semibold text-[#56635e] hover:from-[#e8ecea] hover:to-[#dde0de] disabled:opacity-50 transition-all duration-200 active:scale-95"
                >
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="mx-auto min-w-0 max-w-7xl px-4 pb-28 sm:px-6 lg:mx-0 lg:max-w-none lg:flex-1 lg:px-8 lg:pb-16 lg:pt-0 lg:h-[calc(100vh)] lg:overflow-y-auto xl:px-12">
          {/* Global Header */}
          <div className="sticky top-16 lg:top-0 z-10  -mx-4 bg-[#f3f6f4]/95 backdrop-blur-sm px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-12 xl:px-12">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <StudentAvatar src={avatarDataUri} name={student.studentName} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#e04a15]">{greeting}</p>
                  <h1 className="mt-1 truncate text-2xl font-bold text-[#17231f] sm:text-3xl">
                    {firstName}
                  </h1>
                  <p className="mt-1 text-sm text-[#68756f]">
                    {activeSection === "overview" && "Your next class, progress, and recent feedback in one place."}
                    {activeSection === "classes" && "View your upcoming scheduled classes and join when it's time."}
                    {activeSection === "attendance" && "Review your class attendance history and coach notes."}
                    {activeSection === "report" && "Your latest progress report and evaluation from your coach."}
                    {activeSection === "profile" && "Your personal information and academy record."}
                    {activeSection === "help" && "Get help with your account, classes, or technical issues."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh dashboard"
                title="Refresh dashboard"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d5ddd8] bg-white text-[#4f5e58] hover:bg-[#eef3f0] disabled:opacity-50 shadow-sm transition-all hover:shadow-md"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {activeSection === "overview" && (
          <section id="overview" className="space-y-6">
            {isPortalLimited && (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#efc1b5] bg-[#fff0ec] p-4 text-[#913c27]">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {portalStatus === "frozen" ? "Your portal is paused" : "Your portal access has expired"}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {portalStatus === "frozen"
                      ? student.frozenReason || "Contact the academy team to resume your classes."
                      : "Your session credits are exhausted. Contact the academy to renew your plan."}
                  </p>
                </div>
              </div>
            )}

            {dashboard.pendingActivation && !currentPackage && (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#bdd5e4] bg-[#edf6fb] p-4 text-[#315f79]">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Package activation in progress</p>
                  <p className="mt-1 text-sm leading-6">
                    Your payment is confirmed. The academy team is assigning your coach and schedule.
                  </p>
                </div>
              </div>
            )}

            {notice && (
              <div
                className={`mt-6 flex items-start gap-3 rounded-lg border p-4 ${noticeStyles[notice.tone]}`}
                role={notice.tone === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {notice.tone === "success" ? (
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <p className="flex-1 text-sm font-medium leading-6">{notice.message}</p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss message"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Hero Section - Next Class */}
            <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#e04a15] via-[#c73d0e] to-[#a8320c] shadow-xl">
              {nextClass ? (
                <div className="relative p-6 sm:p-8">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute left-0 bottom-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
                  </div>
                  
                  <div className="relative grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    {/* Date Card */}
                    <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white shadow-lg">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                        {formatMonth(nextClass.date)}
                      </span>
                      <span className="text-5xl font-bold">{formatDayNumber(nextClass.date)}</span>
                    </div>
                    
                    {/* Class Info */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Next Class</p>
                        {nextClassStatus && (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                              nextClassStatus.tone === 'live' 
                                ? 'bg-white/20 border-white/30 text-white animate-pulse' 
                                : 'bg-white/10 border-white/20 text-white/90'
                            }`}
                          >
                            {nextClassStatus.tone === 'live' && <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />}
                            {nextClassStatus.label}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{nextClass.course}</h2>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          {formatTimeRange(nextClass.startTime, nextClass.endTime)}
                          {nextClass.timezone
                            ? ` ${formatTimeZone(nextClass.joinOpensAt, nextClass.timezone)}`
                            : ""}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4" />
                          {nextClass.coach?.name || "Coach to be assigned"}
                        </span>
                      </div>
                    </div>
                    
                    {/* CTA Button */}
                    <JoinButton
                      classItem={nextClass}
                      now={now}
                      portalLimited={isPortalLimited}
                      joining={joiningClassId === nextClass._id}
                      onJoin={handleJoinClass}
                    />
                  </div>
                </div>
              ) : (
                <div className="relative p-8 sm:p-12">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />
                  </div>
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">    
                      <CalendarDays className="h-8 w-8 text-white" />
                    <div>
                      <p className="text-lg font-semibold text-white">No upcoming class scheduled</p>
                      <p className="mt-1 text-sm text-white/70">
                        Your next class will appear here as soon as the academy schedules it.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Summary Section */}
            <div className={`mt-6 ${CARD_STYLES.info} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#75817c]">Progress Summary</h3>
                <BarChart3 className="h-5 w-5 text-[#e04a15]" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#e04a15]">{attendanceRate}%</p>
                  <p className="mt-1 text-sm font-medium text-[#75817c]">Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#d96745]">{currentPackage?.remainingClasses ?? 0}</p>
                  <p className="mt-1 text-sm font-medium text-[#75817c]">Classes Left</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#e04a15]">{currentPackage ? titleCase(currentPackage.packageType) : "—"}</p>
                  <p className="mt-1 text-sm font-medium text-[#75817c]">Package</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#b07a1f]">{currentPackage?.courseLevel || "—"}</p>
                  <p className="mt-1 text-sm font-medium text-[#75817c]">Level</p>
                </div>
              </div>
            </div>
          </section>
          )}

          {activeSection === "profile" && (
          <section id="profile" className="space-y-6">
            {/* Personal Information */}
            <div className={`${CARD_STYLES.info} overflow-hidden`}>
              <div className="border-b border-[#e5eae7] px-6 py-4">
                <h3 className="font-semibold text-[#17231f]">Personal Information</h3>
              </div>
              <div className="divide-y divide-[#e5eae7]">
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Student name</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.studentName}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Parent / guardian</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.parentName}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Email</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.email}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Phone</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.phoneNumber}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Country</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.country}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Timezone</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.timezone}</span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className={`${CARD_STYLES.info} overflow-hidden`}>
              <div className="border-b border-[#e5eae7] px-6 py-4">
                <h3 className="font-semibold text-[#17231f]">Academic Information</h3>
              </div>
              <div className="divide-y divide-[#e5eae7]">
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Course</span>
                  <span className="text-sm font-medium text-[#17231f]">{student.course}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Enrollment date</span>
                  <span className="text-sm font-medium text-[#17231f]">{formatReadableDate(student.enrollmentDate)}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Enrollment status</span>
                  <span className="text-sm font-medium text-[#17231f]">{titleCase(student.enrollmentStatus)}</span>
                </div>
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm text-[#75817c]">Portal status</span>
                  <span className="text-sm font-medium text-[#17231f]">{titleCase(portalStatus)}</span>
                </div>
              </div>
            </div>
          </section>
          )}

          {activeSection === "classes" && (
          <div className="grid gap-6">
            <section id="classes" className={`${CARD_STYLES.list} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-[#e5eae7] px-6 py-5">
                <div>
                  <h2 className="font-bold">Upcoming schedule</h2>
                  <p className="mt-0.5 text-sm text-[#75817c]">
                    Your next {upcomingClasses.length} scheduled {upcomingClasses.length === 1 ? "class" : "classes"}
                  </p>
                </div>
                <CalendarDays className="h-5 w-5 text-[#e04a15]" />
              </div>

              {upcomingClasses.length ? (
                <div className="divide-y divide-[#e8ecea]">
                  {upcomingClasses.map((classItem) => (
                    <article
                      key={classItem._id}
                      className="grid gap-4 px-6 py-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center hover:bg-[#f8faf9] transition"
                    >
                      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#f5e6e0] to-[#edd8d0] text-[#e04a15] shadow-sm">
                        <span className="text-[10px] font-bold uppercase">{formatMonth(classItem.date)}</span>
                        <span className="text-2xl font-bold">{formatDayNumber(classItem.date)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{classItem.course}</h3>
                          <span className="rounded-full bg-gradient-to-r from-[#f1f3f2] to-[#e8eceb] px-2.5 py-1 text-[11px] font-semibold text-[#66736e]">
                            {titleCase(classItem.classType)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#66736e]">
                          {formatClassDate(classItem.date)} at{" "}
                          {formatTimeRange(classItem.startTime, classItem.endTime)}
                        </p>
                        <p className="mt-1 text-xs text-[#85908b]">
                          {classItem.coach?.name || "Coach to be assigned"}
                          {classItem.timezone
                            ? ` - ${formatTimeZone(classItem.joinOpensAt, classItem.timezone)}`
                            : ""}
                        </p>
                      </div>
                      <JoinButton
                        classItem={classItem}
                        now={now}
                        portalLimited={isPortalLimited}
                        joining={joiningClassId === classItem._id}
                        onJoin={handleJoinClass}
                        compact
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-[#a9b2ae]" />
                  <p className="mt-4 font-semibold">Your schedule is clear</p>
                  <p className="mt-1 text-sm text-[#75817c]">
                    New classes will appear here after they are scheduled.
                  </p>
                </div>
              )}
            </section>
          </div>
          )}

          {activeSection === "overview" && (
          <div className="mt-6 space-y-6">
            {/* Upcoming Classes (Collapsed) */}
            <section className={`${CARD_STYLES.list} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-[#e5eae7] px-6 py-4">
                <div>
                  <h3 className="font-bold">Upcoming Classes</h3>
                  <p className="mt-0.5 text-sm text-[#75817c]">
                    {upcomingClasses.length} scheduled {upcomingClasses.length === 1 ? "class" : "classes"}
                  </p>
                </div>
                <CalendarDays className="h-5 w-5 text-[#e04a15]" />
              </div>

              {upcomingClasses.length ? (
                <div className="divide-y divide-[#e8ecea]">
                  {upcomingClasses.slice(0, 3).map((classItem) => (
                    <article
                      key={classItem._id}
                      className="grid gap-4 px-6 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center hover:bg-[#f8faf9] transition"
                    >
                      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#f5e6e0] to-[#edd8d0] text-[#e04a15] shadow-sm">
                        <span className="text-[10px] font-bold uppercase">{formatMonth(classItem.date)}</span>
                        <span className="text-2xl font-bold">{formatDayNumber(classItem.date)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">{classItem.course}</h4>
                          <span className="rounded-full bg-gradient-to-r from-[#f1f3f2] to-[#e8eceb] px-2.5 py-1 text-[11px] font-semibold text-[#66736e]">
                            {titleCase(classItem.classType)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#66736e]">
                          {formatClassDate(classItem.date)} at{" "}
                          {formatTimeRange(classItem.startTime, classItem.endTime)}
                        </p>
                        <p className="mt-1 text-xs text-[#85908b]">
                          {classItem.coach?.name || "Coach to be assigned"}
                          {classItem.timezone
                            ? ` - ${formatTimeZone(classItem.joinOpensAt, classItem.timezone)}`
                            : ""}
                        </p>
                      </div>
                      <JoinButton
                        classItem={classItem}
                        now={now}
                        portalLimited={isPortalLimited}
                        joining={joiningClassId === classItem._id}
                        onJoin={handleJoinClass}
                        compact
                      />
                    </article>
                  ))}
                  {upcomingClasses.length > 3 && (
                    <div className="px-6 py-3 text-center">
                      <Link href="#classes" className="text-sm font-semibold text-[#e04a15] hover:text-[#c73d0e]">
                        View all {upcomingClasses.length} classes →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-[#a9b2ae]" />
                  <p className="mt-4 font-semibold">Your schedule is clear</p>
                  <p className="mt-1 text-sm text-[#75817c]">
                    New classes will appear here after they are scheduled.
                  </p>
                </div>
              )}
            </section>

            {/* Package Details */}
            <section className={`${CARD_STYLES.info} p-6`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold">Package Details</h3>
                  <p className="mt-1 text-sm text-[#75817c]">
                    {currentPackage ? titleCase(currentPackage.status) : "No active package"}
                  </p>
                </div>
                <PackageCheck className="h-5 w-5 text-[#e04a15]" />
              </div>

              {currentPackage ? (
                <div className="space-y-4">
                  <ProgressMeter
                    label="Purchased sessions"
                    completed={regularCompleted}
                    total={regularTotal}
                    tone="green"
                  />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#e5eae7] pt-4">
                    <div>
                      <dt className="text-xs font-medium text-[#75817c]">Course</dt>
                      <dd className="mt-1 text-sm font-semibold">{student.course}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#75817c]">Batch</dt>
                      <dd className="mt-1 break-words text-sm font-semibold">
                        {currentBatch?.name || "Not assigned"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#75817c]">Batch sessions</dt>
                      <dd className="mt-1 text-sm font-semibold">{batchSessionsText}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#75817c]">Batch coach</dt>
                      <dd className="mt-1 break-words text-sm font-semibold">
                        {currentBatch?.coach?.name || "Not assigned"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="rounded-xl bg-gradient-to-br from-[#f3f6f4] to-[#e8eceb] p-5">
                  <p className="text-sm font-medium text-[#56635e]">
                    Your package details will appear after activation.
                  </p>
                </div>
              )}
            </section>
          </div>
          )}

          {activeSection === "attendance" && (
          <div className="grid gap-6">
            <section id="attendance" className={`${CARD_STYLES.list} overflow-hidden`}>
              <div className="flex items-center justify-between gap-4 border-b border-[#e5eae7] px-6 py-5">
                <div>
                  <h2 className="font-bold">Recent attendance</h2>
                  <p className="mt-0.5 text-sm text-[#75817c]">
                    Review class status and coach notes
                  </p>
                </div>
                {recentAttendance.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllAttendance((current) => !current)}
                    className="text-sm font-semibold text-[#e04a15] hover:text-[#c73d0e]"
                  >
                    {showAllAttendance ? "Show less" : "View all"}
                  </button>
                )}
              </div>

              {visibleAttendance.length ? (
                <div className="divide-y divide-[#e8ecea]">
                  {visibleAttendance.map((attendance) => (
                    <AttendanceRow
                      key={attendance._id}
                      attendance={attendance}
                      disputeOpen={disputeAttendanceId === attendance._id}
                      disputeReason={disputeReason}
                      submitting={submittingDispute}
                      onOpenDispute={() => {
                        setDisputeAttendanceId(attendance._id);
                        setDisputeReason("");
                        setNotice(null);
                      }}
                      onReasonChange={setDisputeReason}
                      onSubmit={() => handleDispute(attendance._id)}
                      onCancel={() => {
                        setDisputeAttendanceId(null);
                        setDisputeReason("");
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <History className="mx-auto h-10 w-10 text-[#a9b2ae]" />
                  <p className="mt-4 font-semibold">No attendance history yet</p>
                  <p className="mt-1 text-sm text-[#75817c]">
                    Completed class records will appear here.
                  </p>
                </div>
              )}
            </section>
          </div>
          )}

          {activeSection === "report" && (
          <div className="grid gap-6">
            <section id="report" className={`${CARD_STYLES.info} p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold">Latest progress report</h2>
                  <p className="mt-1 text-sm text-[#75817c]">Published by your coach</p>
                </div>
                <Award className="h-5 w-5 text-[#b07a1f]" />
              </div>

              {latestEvaluation ? (
                <div className="mt-5">
                  <div className="border-b border-[#e5eae7] pb-4">
                    <p className="font-semibold">{latestEvaluation.title || "Evaluation report"}</p>
                    <p className="mt-1 text-sm text-[#75817c]">
                      {latestEvaluation.coach?.name
                        ? `Coach ${latestEvaluation.coach.name}`
                        : "Your coaching team"}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {scoreRows.map((score) => {
                      const value = Math.max(0, Math.min(10, Number(score.value) || 0));
                      return (
                        <div key={score.label}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="text-[#56635e]">{score.label}</span>
                            <span className="font-semibold">{value}/10</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#e7ece9]">
                            <div
                              className="h-full rounded-full bg-[#46799a]"
                              style={{ width: `${value * 10}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {latestEvaluation.strengths?.length > 0 && (
                    <div className="mt-5 border-t border-[#e5eae7] pt-4">
                      <p className="text-xs font-semibold uppercase text-[#75817c]">Strengths</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {latestEvaluation.strengths.slice(0, 3).map((strength) => (
                          <span
                            key={strength}
                            className="rounded-full bg-[#f5e6e0] px-2.5 py-1 text-xs font-medium text-[#e04a15]"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {latestEvaluation.coachNotes && (
                    <div className="mt-5 border-t border-[#e5eae7] pt-4">
                      <p className="text-xs font-semibold uppercase text-[#75817c]">Coach note</p>
                      <p className="mt-2 text-sm leading-6 text-[#4f5d57]">
                        {latestEvaluation.coachNotes}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#fff5e4] px-4 py-3 text-sm">
                    <span className="text-[#76551d]">Recommended next</span>
                    <span className="font-bold text-[#6d4b13]">
                      {latestEvaluation.recommendedNextLevel || "To be reviewed"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-gradient-to-br from-[#f3f6f4] to-[#e8eceb] p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-[#9aa6a0]" />
                  <p className="mt-4 font-semibold">No report published yet</p>
                  <p className="mt-1 text-sm leading-6 text-[#75817c]">
                    Your coach's evaluation will appear here once it is ready.
                  </p>
                </div>
              )}
            </section>
          </div>
          )}

          {activeSection === "help" && (
          <section id="help" className="space-y-6">
            {/* Hero Card */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#e04a15] via-[#c73d0e] to-[#a8320c] shadow-xl">
              <div className="relative p-8 sm:p-10">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />
                </div>
                <div className="relative">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">How can we help?</h2>
                  <p className="mt-2 text-sm text-white/80 sm:text-base">
                    We're here to assist you with any questions or concerns about your chess journey.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Contact Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="mailto:support@emberkids.com"
                className="group flex items-center gap-4 rounded-xl border border-[#e5eae7] bg-white p-5 hover:border-[#e04a15] hover:shadow-md transition-all"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5e6e0] to-[#edd8d0] text-[#e04a15] group-hover:scale-110 transition-transform">
                  <Mail className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#17231f]">Email Us</p>
                  <p className="text-sm text-[#75817c]">support@emberkids.com</p>
                </div>
              </a>
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-[#e5eae7] bg-white p-5 hover:border-[#e04a15] hover:shadow-md transition-all"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5e6e0] to-[#edd8d0] text-[#e04a15] group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#17231f]">WhatsApp</p>
                  <p className="text-sm text-[#75817c]">Chat instantly</p>
                </div>
              </a>
            </div>

            {/* Help Form */}
            <div className={`${CARD_STYLES.info} p-6`}>
              <h3 className="font-bold text-[#17231f] mb-4">Send us a message</h3>
              <form onSubmit={handleHelpSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="help-name" className="block text-sm font-medium text-[#75817c] mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="help-name"
                      value={helpForm.name}
                      onChange={(e) => setHelpForm({ ...helpForm, name: e.target.value })}
                      className="w-full rounded-lg border border-[#d5ddd8] bg-white px-4 py-2.5 text-sm focus:border-[#e04a15] focus:outline-none focus:ring-2 focus:ring-[#e04a15]/20"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="help-subject" className="block text-sm font-medium text-[#75817c] mb-1.5">
                      Subject
                    </label>
                    <select
                      id="help-subject"
                      value={helpForm.subject}
                      onChange={(e) => setHelpForm({ ...helpForm, subject: e.target.value })}
                      className="w-full rounded-lg border border-[#d5ddd8] bg-white px-4 py-2.5 text-sm focus:border-[#e04a15] focus:outline-none focus:ring-2 focus:ring-[#e04a15]/20"
                    >
                      <option value="">Select a topic</option>
                      <option value="account">Account & Profile</option>
                      <option value="classes">Classes & Schedule</option>
                      <option value="attendance">Attendance Issues</option>
                      <option value="technical">Technical Support</option>
                      <option value="payment">Payment & Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="help-message" className="block text-sm font-medium text-[#75817c] mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="help-message"
                    rows={5}
                    value={helpForm.message}
                    onChange={(e) => setHelpForm({ ...helpForm, message: e.target.value })}
                    className="w-full rounded-lg border border-[#d5ddd8] bg-white px-4 py-2.5 text-sm focus:border-[#e04a15] focus:outline-none focus:ring-2 focus:ring-[#e04a15]/20 resize-none"
                    placeholder="Describe your issue or question in detail..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingHelp}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e04a15] to-[#c73d0e] px-8 text-sm font-semibold text-white hover:from-[#c73d0e] hover:to-[#a8320c] transition-all duration-200 active:scale-95 shadow-lg shadow-[#e04a15]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingHelp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submittingHelp ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>

            {/* FAQ Section */}
            <div className={`${CARD_STYLES.info} p-6`}>
              <h3 className="font-bold text-[#17231f] mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#17231f] hover:bg-[#f0f3f1] transition-colors">
                    How do I join my class?
                    <X className="h-4 w-4 text-[#75817c] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 px-4 text-sm leading-6 text-[#68756f]">
                    Go to the Classes section and click the "Join" button when your class is scheduled. The button will be active 15 minutes before the class starts.
                  </p>
                </details>
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#17231f] hover:bg-[#f0f3f1] transition-colors">
                    How do I update my profile?
                    <X className="h-4 w-4 text-[#75817c] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 px-4 text-sm leading-6 text-[#68756f]">
                    Go to the Profile section to view your information. For any changes, please contact our support team via email or phone.
                  </p>
                </details>
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#17231f] hover:bg-[#f0f3f1] transition-colors">
                    What if I miss a class?
                    <X className="h-4 w-4 text-[#75817c] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 px-4 text-sm leading-6 text-[#68756f]">
                    If you miss a class, it will be marked as absent in your attendance. You can request a review from the Attendance section if there was a valid reason.
                  </p>
                </details>
              </div>
            </div>
          </section>
          )}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-[#dce3df] bg-white/95 backdrop-blur-md px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-24px_rgba(23,35,31,0.45)] lg:hidden"
        aria-label="Student dashboard"
      >
        {navigation.map(({ id, href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            onClick={(event) => handleSectionChange(event, id)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeSection === id ? "text-[#e04a15] bg-[#f5e6e0]" : "text-[#73807a] hover:bg-[#f8faf9]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function AttendanceRow({
  attendance,
  disputeOpen,
  disputeReason,
  submitting,
  onOpenDispute,
  onReasonChange,
  onSubmit,
  onCancel,
}: {
  attendance: AttendanceItem;
  disputeOpen: boolean;
  disputeReason: string;
  submitting: boolean;
  onOpenDispute: () => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const statusStyles =
    attendance.status === "present"
      ? "bg-[#e6f3ed] text-[#23604b]"
      : attendance.status === "absent"
        ? "bg-[#fdebe6] text-[#a3452e]"
        : attendance.status === "disputed"
          ? "bg-[#fff3dd] text-[#805b1d]"
          : "bg-[#eef1ef] text-[#5e6b65]";

  return (
    <article className="px-6 py-5 hover:bg-[#f8faf9] transition">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">{attendance.class?.course || "Chess class"}</p>
          {attendance.class?.date && (
            <p className="mt-1 text-sm text-[#66736e]">
              {formatClassDate(attendance.class.date)} at{" "}
              {formatTimeRange(attendance.class.startTime, attendance.class.endTime)}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyles}`}>
          {titleCase(attendance.status)}
        </span>
      </div>

      {attendance.class?.classNotes && (
        <div className="mt-4 rounded-xl bg-gradient-to-br from-[#f3f6f4] to-[#e8eceb] px-4 py-3">
          <p className="text-xs font-semibold text-[#56635e]">Coach note</p>
          <p className="mt-1 break-words text-sm leading-5 text-[#68756f]">
            {attendance.class.classNotes}
          </p>
        </div>
      )}

      {attendance.status === "disputed" && attendance.disputeReason && (
        <p className="mt-3 text-xs leading-5 text-[#80601f]">
          Review requested: {attendance.disputeReason}
        </p>
      )}

      {attendance.status === "absent" && !disputeOpen && (
        <button
          type="button"
          onClick={onOpenDispute}
          className="mt-3 text-sm font-semibold text-[#a3452e] hover:text-[#813520]"
        >
          Request attendance review
        </button>
      )}

      {disputeOpen && (
        <div className="mt-4 border-t border-[#e5eae7] pt-4">
          <label htmlFor={`dispute-${attendance._id}`} className="text-sm font-semibold">
            What happened?
          </label>
          <textarea
            id={`dispute-${attendance._id}`}
            value={disputeReason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Share a short explanation for your coach."
            className="mt-2 w-full resize-y rounded-xl border border-[#cfd8d3] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#98a29d] focus:border-[#2f765f] focus:ring-2 focus:ring-[#2f765f]/15"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[#85908b]">{disputeReason.length}/500</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="rounded-xl border border-[#d3dbd7] px-4 py-2 text-xs font-semibold text-[#56635e] hover:bg-[#f2f5f3] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#205b49] px-4 py-2 text-xs font-semibold text-white hover:bg-[#174737] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
