"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import { getCoachReports, getStaffList, type CoachReports, type StaffMember } from "@/lib/adminApi";

function text(value: unknown) { return value === undefined || value === null || value === "" ? "—" : String(value); }
function date(value: unknown) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(String(value))) : "—"; }

export default function CoachReportsManager({ staffView = false }: { staffView?: boolean }) {
  const [reports, setReports] = useState<CoachReports | null>(null);
  const [coaches, setCoaches] = useState<StaffMember[]>([]);
  const [filters, setFilters] = useState({ coach: "", day: "", dateFrom: "", dateTo: "", country: "", timezone: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCoachReports(appliedFilters);
      if (response.success) setReports(response.data);
      else setError(response.error || "Could not load coach reports");
    } catch { setError("Could not connect to the server."); }
    finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!staffView) getStaffList("coach").then((response) => response.success && setCoaches(response.data || [])); }, [staffView]);

  if (loading && !reports) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" /></div>;
  const summary = reports?.summary;
  const trialRows = reports?.studentTrialReport || [];
  const batchRows = reports?.batchReport || [];
  const masterclassRows = reports?.masterclassReport || [];
  const coverRows = reports?.coverUpReport || [];
  const dailyClassRows = batchRows.flatMap((batch) => {
    const schedule = Array.isArray(batch.dailyClassSchedule) ? batch.dailyClassSchedule as Record<string, unknown>[] : [];
    return schedule.map((classItem) => [
      text(batch.batchName),
      date(classItem.date),
      `${text(classItem.startTime)} – ${text(classItem.endTime)}`,
      text(classItem.sessionNumber),
      text(classItem.status),
    ]);
  });
  const dailyTitle = appliedFilters.day ? `Classes scheduled on ${date(appliedFilters.day)}` : "Daily Class Schedule";

  return <div>
    <PageHeader title="Coach Reports" description="Classes, trials, masterclasses, batches, and cover-up history in one report." />
    {error && <div className="admin-alert admin-alert-error">{error}</div>}
    <div className="admin-toolbar flex-wrap items-end">
      {!staffView && <select className="admin-control admin-control-select" value={filters.coach} onChange={(e) => setFilters({ ...filters, coach: e.target.value })}><option value="">All coaches</option>{coaches.map((coach) => <option key={coach._id} value={coach._id}>{coach.name}</option>)}</select>}
      <label className="text-xs font-semibold text-[var(--color-muted)]">Daily class date<input type="date" className="admin-control mt-1" value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })} /></label>
      <label className="text-xs font-semibold text-[var(--color-muted)]">History from<input type="date" className="admin-control mt-1" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} /></label>
      <label className="text-xs font-semibold text-[var(--color-muted)]">History to<input type="date" className="admin-control mt-1" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} /></label>
      <input className="admin-control" placeholder="Country (e.g. IN)" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value.toUpperCase() })} />
      <input className="admin-control" placeholder="Time zone" value={filters.timezone} onChange={(e) => setFilters({ ...filters, timezone: e.target.value })} />
      <button className="admin-control bg-[var(--color-walnut)] text-white" onClick={() => setAppliedFilters(filters)}>Apply filters</button>
    </div>
    <p className="mb-6 text-xs text-[var(--color-muted)]">Daily class date controls the schedule below. History dates continue to scope the totals and supporting reports.</p>
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard label="Classes Conducted" value={summary?.totalClassesConducted ?? 0} icon={BarChart3} accent="pine" />
      <StatCard label="Demo Classes" value={summary?.totalDemoClasses ?? 0} icon={BarChart3} accent="gold" />
      <StatCard label="Trial Classes" value={summary?.totalTrialClasses ?? 0} icon={BarChart3} accent="ember" />
      <StatCard label="Masterclasses" value={summary?.totalMasterclassesConducted ?? 0} icon={BarChart3} accent="walnut" />
      <StatCard label="Cover-up Classes" value={summary?.totalCoverUpClasses ?? 0} icon={BarChart3} accent="gold" />
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <ReportTable title={dailyTitle} columns={["Batch", "Date", "Time", "Session", "Status"]} rows={dailyClassRows} emptyMessage={appliedFilters.day ? "No regular classes are scheduled for this day." : "Choose a daily class date to view only that day's regular classes."} />
      <ReportTable title="Student Trial Report" columns={["Student", "Country", "Time zone", "Trial date", "Status", "Enrollment"]} rows={trialRows.map((row) => [text(row.studentName), text(row.country), text(row.timezone), `${date(row.trialDate)} ${text(row.startTime)}`, text(row.trialStatus), text(row.enrollmentStatus)])} />
      <ReportTable title="Masterclass Report" columns={["Masterclass", "Date", "Time", "Country", "Time zone", "Status"]} rows={masterclassRows.map((row) => [text(row.masterclassName), date(row.date), text(row.time), text(row.country), text(row.timezone), text(row.status)])} />
      <ReportTable title="Cover-up / Substitute Report" columns={["Batch", "Assigned coach", "Date", "Status"]} rows={coverRows.map((row) => [text(row.batchName), text(row.assignedCoach), `${date(row.date)} ${text(row.startTime)}`, text(row.status)])} />
      <ReportTable title="Batch Progress Report" columns={["Batch", "Schedule", "Completion", "Regular classes completed"]} rows={batchRows.map((row) => [text(row.batchName), text(row.schedule), text(row.completionStatus), `${text(row.totalCompletedClasses)} / ${text(row.totalScheduledClasses)}`])} />
    </div>
  </div>;
}

function ReportTable({ title, columns, rows, emptyMessage = "No records found." }: { title: string; columns: string[]; rows: string[][]; emptyMessage?: string }) {
  return <section className="admin-table-shell"><div className="border-b border-[var(--color-line)] px-5 py-4 font-semibold text-[var(--color-walnut)]">{title}</div>{rows.length === 0 ? <div className="admin-empty">{emptyMessage}</div> : <div className="overflow-x-auto"><table className="admin-table min-w-full"><thead><tr>{columns.map((column) => <th key={column} className="text-left">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>;
}
