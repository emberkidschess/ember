"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
 

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  UserCheck,
  CalendarClock,
  Mail,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Loader2,
  Calendar,
  AlertTriangle,
  Bell,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAdminDashboard, type PaymentLink } from "@/lib/adminApi";
import { formatCurrency } from "@/lib/currency";
import { formatCourseLevel, toTitleLabel } from "@/lib/labels";

function formatRevenueByCurrency(value: unknown): string {
  if (!value || typeof value !== "object") return "—";
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number");
  return entries.length
    ? entries.map(([currency, amount]) => formatCurrency(amount, currency)).join(" · ")
    : "—";
}

export default function AdminDashboardPage() {
   
  const [overview, setOverview] = useState<Record<string, any> | null>(null);
   
  const [recentLeads, setRecentLeads] = useState<Record<string, any>[]>([]);
   
  const [recentStudents, setRecentStudents] = useState<Record<string, any>[]>([]);
  const [pendingActivations, setPendingActivations] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const dashboardRes = await getAdminDashboard();

        if (dashboardRes.success) {
           
          setOverview((dashboardRes.data as any).overview ?? null);
           
          setRecentLeads((dashboardRes.data as any).recentLeads ?? []);
           
          setRecentStudents((dashboardRes.data as any).recentStudents ?? []);
          setPendingActivations((dashboardRes.data as any).pendingActivations ?? []);
        } else {
          setError(dashboardRes.error || "Failed to load dashboard");
        }
      } catch {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 text-[var(--color-ember)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-ember)]/10 border border-[var(--color-ember)]/20 text-[var(--color-ember-deep)] px-5 py-4 rounded-xl">
        {error}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="A snapshot of how the academy is doing today." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={overview?.totalLeads ?? 0} icon={Users} accent="gold" hint={`${overview?.newLeadsToday ?? 0} new today`} />
        <StatCard label="Active Students" value={overview?.activeStudents ?? 0} icon={GraduationCap} accent="pine" hint={`${overview?.totalStudents ?? 0} total`} />
        <StatCard label="Active Staff" value={overview?.activeStaff ?? 0} icon={UserCheck} accent="walnut" hint={`${overview?.totalStaff ?? 0} total`} />
        <StatCard label="Conversion Rate" value={`${overview?.leadConversionRate ?? 0}%`} icon={TrendingUp} accent="ember" hint="leads to students" />
        <StatCard label="Trial Classes" value={overview?.totalTrialBookings ?? 0} icon={CalendarClock} accent="gold" hint={`${overview?.newTrialBookingsToday ?? 0} new today`} />
        <StatCard label="Inquiries" value={overview?.totalInquiries ?? 0} icon={Mail} accent="walnut" hint={`${overview?.newInquiriesToday ?? 0} new today`} />
        <StatCard label="Today's Classes" value={overview?.todayClasses ?? 0} icon={Calendar} accent="pine" hint="scheduled today" />
        <StatCard label="Pending Revenue" value={formatRevenueByCurrency(overview?.pendingPackageRevenueByCurrency)} icon={DollarSign} accent="ember" />
        <StatCard label="Revenue Collected" value={formatRevenueByCurrency(overview?.totalPackageRevenueByCurrency)} icon={DollarSign} accent="pine" />
        <StatCard label="Portal Expired" value={overview?.studentsWaitingForPortal ?? 0} icon={AlertTriangle} accent="ember" hint="need renewal" />
        <StatCard label="Recent Notifications" value={overview?.recentNotificationsCount ?? 0} icon={Bell} accent="walnut" hint="last 10" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Activations */}
        <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
            <h2 className="font-semibold text-[var(--color-walnut)]">Awaiting Activation</h2>
          </div>
          <div className="divide-y divide-[var(--color-line)] max-h-[360px] overflow-y-auto">
            {pendingActivations.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[var(--color-muted)] text-center">No payments waiting for activation.</p>
            ) : (
              pendingActivations.map((link: any) => (
                <div key={link._id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--color-walnut)] truncate">
                      {link.student?.studentName || "Unknown student"}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] truncate">{link.packageType} · {formatCourseLevel(link.courseLevel)}</p>
                  </div>
                  <StatusBadge status={link.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
            <h2 className="font-semibold text-[var(--color-walnut)]">Recent Leads</h2>
          </div>
          <div className="divide-y divide-[var(--color-line)] max-h-[360px] overflow-y-auto">
            {recentLeads.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[var(--color-muted)] text-center">No leads yet.</p>
            ) : (
              recentLeads.map((lead: any) => (
                <div key={lead._id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--color-walnut)] truncate">{lead.studentName}</p>
                    <p className="text-xs text-[var(--color-muted)] truncate">{toTitleLabel(lead.courseInterest)}</p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {recentStudents.length > 0 && (
        <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)] mt-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
            <h2 className="font-semibold text-[var(--color-walnut)]">Recently Enrolled Students</h2>
            <Link href="/admin/students" className="text-xs font-semibold text-[var(--color-ember)] hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {recentStudents.map((student: any) => (
              <div key={student._id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--color-walnut)] truncate">{student.studentName}</p>
                  <p className="text-xs text-[var(--color-muted)] truncate">{student.course}</p>
                </div>
                <StatusBadge status={student.studentStatus} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
