"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, RotateCcw, BarChart3, Users, Clock, CheckCircle, TrendingUp } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { primaryButtonClass, secondaryButtonClass } from "@/components/admin/FormField";
import { getCoachReports, getStaffList, type CoachReports, type StaffMember } from "@/lib/adminApi";
import { getCurrentUser } from "@/lib/auth";

function text(value: unknown) { return value === undefined || value === null || value === "" ? "—" : String(value); }
function date(value: unknown) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(String(value))) : "—"; }
function localDateValue(offsetDays = 0) {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const COUNTRIES = ["US", "CA", "IN", "SA", "AE", "QA", "KW", "BH", "OM"];
const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver", "Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Asia/Kuwait",
  "Asia/Bahrain", "Asia/Muscat",
];

export default function CoachReportsManager({ staffView = false }: { staffView?: boolean }) {
  const currentUser = getCurrentUser();
  const isCoach = staffView && currentUser?.role === "coach";
  const [reports, setReports] = useState<CoachReports | null>(null);
  const [coaches, setCoaches] = useState<StaffMember[]>([]);
  const [filters, setFilters] = useState({ coach: "", day: localDateValue(), dateFrom: "", dateTo: "", country: "", timezone: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getCoachReports(appliedFilters);
      if (response.success) setReports(response.data);
      else setError(response.error || "Could not load coach reports");
    } catch { setError("Could not connect to the server."); }
    finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!isCoach) getStaffList("coach").then((response) => response.success && setCoaches(response.data || [])); }, [isCoach]);

  const setQuickDay = (day: string) => setFilters((current) => ({ ...current, day }));
  const setQuickRange = (days: number) => {
    const dateTo = localDateValue();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const dateFrom = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
    setFilters((current) => ({ ...current, dateFrom, dateTo }));
  };
  const resetFilters = () => {
    const reset = { coach: "", day: localDateValue(), dateFrom: "", dateTo: "", country: "", timezone: "" };
    setFilters(reset);
    setAppliedFilters(reset);
  };

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
    <PageHeader title="Coach Reports" description="Operational insights for completed activity, trial classes, academy events, cover-up work, and batch progress." />
    {error && <div className="admin-alert admin-alert-error">{error}</div>}
    
    <section className="mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-[var(--color-ember)]" />
        <h3 className="font-semibold text-[var(--color-walnut)]">Report Filters</h3>
      </div>
      
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Daily Schedule</label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <label className="sr-only">Class date</label>
                <input type="date" className="admin-control w-full" value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })} />
              </div>
              <button type="button" onClick={() => setQuickDay(localDateValue())} className={secondaryButtonClass}>Today</button>
              <button type="button" onClick={() => setQuickDay(localDateValue(1))} className={secondaryButtonClass}>Tomorrow</button>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">History Scope</label>
            <div className="flex flex-wrap items-end gap-2">
              {!isCoach && (
                <div className="flex-1 min-w-[140px]">
                  <label className="sr-only">Coach</label>
                  <select className="admin-control admin-control-select w-full" value={filters.coach} onChange={(e) => setFilters({ ...filters, coach: e.target.value })}>
                    <option value="">All coaches</option>
                    {coaches.map((coach) => <option key={coach._id} value={coach._id}>{coach.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[120px]">
                <label className="sr-only">From date</label>
                <input type="date" className="admin-control w-full" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="sr-only">To date</label>
                <input type="date" className="admin-control w-full" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setQuickRange(7)} className="text-xs font-semibold text-[var(--color-pine-deep)] hover:underline">Last 7 days</button>
              <button type="button" onClick={() => setQuickRange(30)} className="text-xs font-semibold text-[var(--color-pine-deep)] hover:underline">Last 30 days</button>
              <button type="button" onClick={() => setFilters((current) => ({ ...current, dateFrom: "", dateTo: "" }))} className="text-xs font-semibold text-[var(--color-pine-deep)] hover:underline">All time</button>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Location</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="admin-control admin-control-select" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })}>
                <option value="">All countries</option>
                {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
              <select className="admin-control admin-control-select" value={filters.timezone} onChange={(e) => setFilters({ ...filters, timezone: e.target.value })}>
                <option value="">All time zones</option>
                {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex items-end gap-2 pt-2">
            <button type="button" className={secondaryButtonClass} onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />Reset
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => setAppliedFilters(filters)}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
      
      <p className="mt-4 text-xs text-[var(--color-muted)] border-t border-[var(--color-line)] pt-3">
        The daily schedule uses the selected class date. History dates only affect summary totals and historical tables.
      </p>
    </section>
    <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard icon={Clock} label="Regular Classes" value={summary?.totalRegularClassesConducted ?? 0} description="Recurring batch sessions" />
      <MetricCard icon={Users} label="Trial Classes" value={summary?.totalTrialClasses ?? 0} description="Pre-enrollment sessions" />
      <MetricCard icon={BarChart3} label="Masterclasses" value={summary?.totalMasterclassesConducted ?? 0} description="Academy events" />
      <MetricCard icon={CheckCircle} label="Cover-up Classes" value={summary?.totalCoverUpClasses ?? 0} description="Extra/substitute sessions" />
      <MetricCard icon={TrendingUp} label="Completed Batches" value={summary?.totalCompletedBatches ?? 0} description="Finished batches" />
    </section>
    <div className="space-y-6">
      <ReportTable title={dailyTitle} description="Regular batch sessions for the selected class date." columns={["Batch", "Date", "Time", "Session", "Status"]} rows={dailyClassRows} emptyMessage={appliedFilters.day ? "No regular classes are scheduled for this day." : "Choose a daily class date to view only that day's regular classes."} />
      <ReportTable title="Trial Class Report" description="All pre-enrollment evaluation sessions, with enrollment outcome." columns={["Student / lead", "Country", "Time zone", "Trial date", "Time", "Status", "Enrollment"]} rows={trialRows.map((row) => [text(row.studentName), text(row.country), text(row.timezone), date(row.trialDate), `${text(row.startTime)} – ${text(row.endTime)}`, text(row.trialStatus), text(row.enrollmentStatus)])} />
      <ReportTable title="Masterclass Report" description="Academy masterclass events, not regular batch sessions." columns={["Masterclass", "Date", "Time", "Country", "Time zone", "Status"]} rows={masterclassRows.map((row) => [text(row.masterclassName), date(row.date), text(row.time), text(row.country), text(row.timezone), text(row.status)])} />
      <ReportTable title="Extra / Cover-up Report" description="Additional or substitute classes created to cover a missed or changed session." columns={["Batch", "Assigned coach", "Date", "Time", "Reason", "Status"]} rows={coverRows.map((row) => [text(row.batchName), text(row.assignedCoach), date(row.date), text(row.startTime), text(row.reason), text(row.status)])} />
      <ReportTable title="Batch Progress Report" description="Course-level progress for batches visible to the selected coach or admin. Completed batches are also counted in the summary above." columns={["Batch", "Schedule", "Completion", "Completed on", "Regular classes completed"]} rows={batchRows.map((row) => [text(row.batchName), text(row.schedule), text(row.completionStatus), date(row.completedAt), `${text(row.totalCompletedClasses)} / ${text(row.totalScheduledClasses)}`])} />
    </div>
  </div>;
}

function MetricCard({ icon: Icon, label, value, description }: { icon: any; label: string; value: number; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 shadow-sm transition-all hover:shadow-md hover:border-[var(--color-ember)]/30">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-ember)]/10">
          <Icon className="h-5 w-5 text-[var(--color-ember)]" />
        </div>
        <span className="text-2xl font-bold text-[var(--color-walnut)]">{value}</span>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-[var(--color-walnut)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{description}</p>
      </div>
    </div>
  );
}

function ReportTable({ title, description, columns, rows, emptyMessage = "No records found." }: { title: string; description?: string; columns: string[]; rows: string[][]; emptyMessage?: string }) {
  return <section className="admin-table-shell"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4"><div><h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--color-walnut)]">{title}</h2>{description && <p className="mt-1 text-xs text-[var(--color-muted)]">{description}</p>}</div><span className="rounded-full bg-[var(--color-cream)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">{rows.length} {rows.length === 1 ? "row" : "rows"}</span></div>{rows.length === 0 ? <div className="admin-empty">{emptyMessage}</div> : <div className="overflow-x-auto"><table className="admin-table min-w-full"><thead><tr>{columns.map((column) => <th key={column} className="text-left">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>;
}
