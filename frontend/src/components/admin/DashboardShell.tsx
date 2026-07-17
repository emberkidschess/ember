"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  AlertCircle,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Layers,
  FileText,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { getCurrentUser, logout, isAdminRole, hasPermission, verifySession, type AuthUser } from "@/lib/auth";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  adminOnly?: boolean;
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/students", icon: Users, label: "Students" },
      { href: "/admin/leads", icon: UserCheck, label: "Leads" },
      { href: "/admin/batches", icon: Layers, label: "Batches" },
      { href: "/admin/trial-classes", icon: UserCheck, label: "Trial Classes" },
      { href: "/admin/masterclasses", icon: Trophy, label: "Masterclasses" },
      { href: "/admin/tournaments", icon: Trophy, label: "Tournaments" },
      { href: "/admin/attendance-disputes", icon: AlertCircle, label: "Attendance Disputes" },
      { href: "/admin/payment-links", icon: CreditCard, label: "Payment Links" },
      { href: "/admin/packages", icon: FileText, label: "Packages" },
      { href: "/admin/staff", icon: GraduationCap, label: "Staff" },
    ],
  },
];

const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/staff/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "My Work",
    items: [
      { href: "/staff/leads", icon: Users, label: "Leads", requiredAnyPermissions: ["view_leads", "edit_leads", "generate_payment_link", "schedule_trial", "convert_lead_to_student"] },
      { href: "/staff/students", icon: Users, label: "Students", requiredAnyPermissions: ["view_students", "edit_students", "freeze_student_portal", "generate_payment_link", "enroll_student", "upgrade_student_course", "create_report_card", "export_report_card"] },
      { href: "/staff/trial-classes", icon: UserCheck, label: "Trial Classes", requiredAnyPermissions: ["schedule_trial", "mark_trial_result"] },
      { href: "/staff/attendance-disputes", icon: AlertCircle, label: "Attendance Disputes", requiredAnyPermissions: ["resolve_attendance_dispute", "override_attendance"] },
      { href: "/staff/payment-links", icon: CreditCard, label: "Payment Links", requiredAnyPermissions: ["view_payment_history", "generate_payment_link", "send_payment_link", "mark_payment_received", "enroll_student"] },
      { href: "/staff/batches", icon: Layers, label: "Batches", requiredAnyPermissions: ["schedule_classes", "create_edit_class", "assign_students_to_class", "assign_staff_to_class", "enroll_student"] },
      { href: "/staff/classes", icon: GraduationCap, label: "Classes", requiredAnyPermissions: ["schedule_classes", "create_edit_class", "assign_students_to_class", "assign_staff_to_class", "reschedule_class", "cancel_class", "post_class_notes"] },
      { href: "/staff/report-cards", icon: FileText, label: "Report Cards", requiredAnyPermissions: ["view_students", "create_report_card", "export_report_card"] },
      { href: "/staff/reports", icon: FileText, label: "Coach Reports", requiredAnyPermissions: ["view_coach_reports", "view_students", "schedule_classes"] },
    ],
  },
];

interface DashboardShellProps {
  portal: "admin" | "staff";
  children: React.ReactNode;
}

export default function DashboardShell({ portal, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Initialise synchronously from localStorage — avoids setState-in-effect.
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser(portal));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      setChecking(true);
      const currentUser = getCurrentUser(portal);

      try {
        const freshUser = await verifySession(portal);
        if (cancelled) return;

        if (!freshUser) {
          setUser(null);
          router.replace("/login");
          return;
        }

        setUser(freshUser);
      } catch (error) {
        // Don't redirect on network errors - user might still be valid
        console.error('Session verification failed:', error);
        // Keep existing user if we have one
        if (currentUser) {
          setUser(currentUser);
        } else {
          router.replace("/login");
        }
      } finally {
        setChecking(false);
      }
    };

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [portal, router]);

  useEffect(() => {
    const refreshUser = async () => {
      try {
        const freshUser = await verifySession(portal);
        if (freshUser) {
          setUser(freshUser);
        } else {
          setUser(null);
          router.replace("/login");
        }
      } catch (error) {
        console.error('Session refresh failed:', error);
        // Don't redirect on network errors - keep user logged in
      }
    };

    const refreshVisibleUser = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };

    // Only refresh on visibility change, not on every focus
    document.addEventListener("visibilitychange", refreshVisibleUser);
    // Reduce frequency from 10s to 60s
    const intervalId = window.setInterval(refreshVisibleUser, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", refreshVisibleUser);
      window.clearInterval(intervalId);
    };
  }, [portal, router]);

  const handleLogout = async () => {
    await logout(portal);
    router.push("/login");
  };

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-ivory)]">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--color-ember)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const navGroups = (portal === "admin" ? ADMIN_NAV_GROUPS : STAFF_NAV_GROUPS).map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && !isAdminRole(user)) return false;
      if (item.requiredPermission && !hasPermission(item.requiredPermission, user)) return false;
      if (item.requiredAnyPermissions && !item.requiredAnyPermissions.some((permission) => hasPermission(permission, user))) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const allNavItems = navGroups.flatMap((group) => group.items);
  const currentNavItem = allNavItems.find((item) => pathname === item.href || pathname?.startsWith(item.href + "/"));
  const canAccessRoute =
    portal === "admin" ||
    pathname === "/staff/dashboard" ||
    Boolean(currentNavItem);

  if (!canAccessRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-ivory)] px-4">
        <div className="max-w-md rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center shadow-[var(--shadow-card)]">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-ember)]" />
          <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-2xl text-[var(--color-walnut)]">Access restricted</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Your account does not currently have permission to open this staff page. Ask an admin to update your permissions.
          </p>
          <Link href="/staff/dashboard" className="mt-6 inline-flex rounded-xl bg-[var(--color-ember)] px-5 py-3 text-sm font-semibold text-white">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-ivory)] text-[var(--color-walnut)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-[var(--color-walnut)] text-[var(--color-paper)] flex flex-col z-50 transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/10 shrink-0">
          <Link href={`/${portal}/dashboard`} className="font-[family-name:var(--font-playfair)] font-bold text-lg">
            EmberKids <span className="text-[var(--color-gold)]">{portal === "admin" ? "Admin" : (user.role === "coach" ? "Coach" : "Staff")}</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active
                          ? "bg-[var(--color-ember)] text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[var(--color-paper)] border-b border-[var(--color-line)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[var(--color-walnut)]"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-[var(--color-ivory)] transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ember)] text-white text-sm font-bold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </span>
              <span className="hidden sm:block text-sm font-medium text-[var(--color-walnut)]">{user.name}</span>
              <ChevronDown className="hidden sm:block h-4 w-4 text-[var(--color-muted)]" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-[var(--shadow-card)] border border-[var(--color-line)] py-1.5 z-40">
                  <div className="px-3.5 py-2 border-b border-[var(--color-line)]">
                    <p className="text-sm font-semibold text-[var(--color-walnut)] truncate">{user.email}</p>
                    <p className="text-xs text-[var(--color-muted)] capitalize">{user.role.replace("_", " ")}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-sm text-[var(--color-ember-deep)] hover:bg-[var(--color-ivory)] flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
