"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, GraduationCap, Loader2, RefreshCw, TrendingUp, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { secondaryButtonClass } from "@/components/admin/FormField";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getStaffDashboard();
      if (response.success) {
        setData(response.data as StaffDashboardData);
      } else {
        setError(response.error || "Failed to load dashboard data");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Staff Dashboard" description="Your operational snapshot for lead follow-up and student management." actions={[{ label: "Refresh", icon: RefreshCw, onClick: () => void load(), disabled: true }]} />
        <div className="flex items-center justify-center py-24" role="status" aria-label="Loading dashboard">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-ember)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Staff Dashboard" description="Your operational snapshot for lead follow-up and student management." actions={[{ label: "Try again", icon: RefreshCw, onClick: () => void load() }]} />
        <div className="admin-alert admin-alert-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className={`${secondaryButtonClass} mt-3`}>
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
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
        actions={[{ label: "Refresh", icon: RefreshCw, onClick: () => void load(), disabled: loading }]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Open Leads" value={overview.totalLeads ?? 0} icon={Users} accent="gold" hint={`${overview.newLeadsToday ?? 0} new today`} />
        <StatCard label="Students" value={overview.totalStudents ?? 0} icon={GraduationCap} accent="pine" hint={`${overview.activeStudents ?? 0} active`} />
        <StatCard label="Converted Leads" value={overview.convertedLeads ?? 0} icon={TrendingUp} accent="ember" hint="your conversions" />
        <StatCard label="Lead Momentum" value={overview.newLeadsToday ?? 0} icon={TrendingUp} accent="ember" hint="new today" />
        <StatCard label="Recent Leads" value={recentLeads.length} icon={CalendarClock} accent="walnut" hint="latest activity" />
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
