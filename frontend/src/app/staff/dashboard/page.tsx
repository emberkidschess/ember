"use client";

import { useEffect, useState } from "react";
import { CalendarClock, GraduationCap, Loader2, TrendingUp, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { getStaffDashboard } from "@/lib/adminApi";

interface StaffDashboardData {
  overview?: {
    totalLeads?: number;
    newLeadsToday?: number;
    totalStudents?: number;
    activeStudents?: number;
    convertedLeads?: number;
  };
  recentLeads?: Record<string, unknown>[];
  recentStudents?: Record<string, unknown>[];
}

export default function StaffDashboardPage() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await getStaffDashboard();
        if (!mounted) return;
        if (response.success) {
          setData(response.data as StaffDashboardData);
        } else {
          setError(response.error || "Failed to load dashboard data");
        }
      } catch {
        if (mounted) setError("Could not connect to the server.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--color-ember)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-ember)]/20 bg-[var(--color-ember)]/10 px-5 py-4 text-[var(--color-ember-deep)]">
        {error}
      </div>
    );
  }

  const overview = data?.overview || {};
  const recentLeads = data?.recentLeads || [];
  const recentStudents = data?.recentStudents || [];

  return (
    <div>
      <PageHeader
        title="Staff Dashboard"
        description="Your operational snapshot for lead follow-up and student management."
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open Leads" value={overview.totalLeads ?? 0} icon={Users} accent="gold" hint={`${overview.newLeadsToday ?? 0} new today`} />
        <StatCard label="Students" value={overview.totalStudents ?? 0} icon={GraduationCap} accent="pine" hint={`${overview.activeStudents ?? 0} active`} />
        <StatCard label="Converted Leads" value={overview.convertedLeads ?? 0} icon={TrendingUp} accent="ember" hint="your conversions" />
        <StatCard label="Lead Momentum" value={overview.newLeadsToday ?? 0} icon={TrendingUp} accent="ember" hint="new today" />
        <StatCard label="Follow-ups" value={recentLeads.length} icon={CalendarClock} accent="walnut" hint="recent leads" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--color-line)] px-5 py-4">
            <h2 className="font-semibold text-[var(--color-walnut)]">Recent Leads</h2>
          </div>
          <div className="max-h-[360px] divide-y divide-[var(--color-line)] overflow-y-auto">
            {recentLeads.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">No recent leads.</p>
            ) : (
              recentLeads.map((lead) => (
                <div key={String(lead._id)} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-walnut)]">{String(lead.studentName || "Unnamed lead")}</p>
                    <p className="truncate text-xs text-[var(--color-muted)]">{String(lead.email || "")}</p>
                  </div>
                  <StatusBadge status={String(lead.status || "new")} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--color-line)] px-5 py-4">
            <h2 className="font-semibold text-[var(--color-walnut)]">Recent Students</h2>
          </div>
          <div className="max-h-[360px] divide-y divide-[var(--color-line)] overflow-y-auto">
            {recentStudents.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">No recent students.</p>
            ) : (
              recentStudents.map((student) => (
                <div key={String(student._id)} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-walnut)]">{String(student.studentName || "Unnamed student")}</p>
                    <p className="truncate text-xs text-[var(--color-muted)]">{String(student.email || "")}</p>
                  </div>
                  <StatusBadge status={String(student.studentStatus || "active")} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
