"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Calendar, CheckCircle, Clock, Loader2, MessageCircle, RefreshCw, Search, Video } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { secondaryButtonClass } from "@/components/admin/FormField";
import { getClasses, startClass, type ClassItem } from "@/lib/adminApi";

function localDateValue() {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBatchName(batch: ClassItem["batch"]) {
  if (!batch) return "Individual";
  return typeof batch === "string" ? "Assigned batch" : batch.name;
}

function getClassDuration(startTime: string, endTime: string) {
  const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  const normalized = minutes <= 0 ? minutes + 24 * 60 : minutes;
  return normalized > 0 ? `${normalized} min` : "—";
}

function formatClassDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatBoundary(value: string, timezone?: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || undefined,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
}

function LiveAccess({ cls, now, onStart }: { cls: ClassItem; now: Date; onStart: (classItem: ClassItem) => void }) {
  const whatsappLink = typeof cls.batch === "object" ? cls.batch?.whatsappCommunityLink : undefined;
  let accessState: ReactNode;

  if (cls.status === "completed") {
    accessState = <span className="text-xs font-semibold text-[var(--color-pine-deep)]">Completed</span>;
  } else if (cls.status !== "scheduled") {
    accessState = <span className="text-xs font-semibold text-[var(--color-muted)]">{cls.status === "cancelled" ? "Cancelled" : "Unavailable"}</span>;
  } else if (!cls.meetingLink) {
    accessState = <span className="text-xs font-semibold text-[var(--color-muted)]">Meeting link unavailable</span>;
  } else if (cls.accessOpensAt && now < new Date(cls.accessOpensAt)) {
    accessState = <span className="text-xs font-semibold text-[var(--color-muted)]">Opens {formatBoundary(cls.accessOpensAt, cls.timezone)}</span>;
  } else if (cls.accessClosesAt && now > new Date(cls.accessClosesAt)) {
    accessState = <span className="text-xs font-semibold text-[var(--color-muted)]">Access closed</span>;
  } else {
    accessState = (
      <button
        type="button"
        onClick={() => onStart(cls)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ember)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-ember-deep)]"
      >
        <Video className="h-3.5 w-3.5" /> {cls.startedAt ? "Open Class" : "Start Now"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {accessState}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Open WhatsApp group"
          aria-label={`Open WhatsApp group for ${getBatchName(cls.batch)}`}
          className="rounded-lg border border-[var(--color-line)] p-2 text-[var(--color-pine-deep)] transition hover:bg-[var(--color-ivory)]"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export default function StaffClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(localDateValue);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { dateFrom: selectedDate, dateTo: selectedDate, limit: 100 };
      const [regularResponse, extraResponse] = await Promise.all([
        getClasses({ ...params, classType: "regular" }),
        getClasses({ ...params, classType: "extra" }),
      ]);
      if (!regularResponse.success || !extraResponse.success) {
        setError(regularResponse.error || extraResponse.error || "Failed to load classes");
        return;
      }
      setClasses([...(regularResponse.data || []), ...(extraResponse.data || [])].sort((left, right) => `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)));
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      const current = new Date();
      setNow(current);
      const boundaries = classes
        .flatMap((classItem) => [classItem.accessOpensAt, classItem.accessClosesAt])
        .filter((value): value is string => Boolean(value))
        .map((value) => Date.parse(value))
        .filter((timestamp) => Number.isFinite(timestamp) && timestamp > current.getTime());
      const nextBoundary = boundaries.length > 0 ? Math.min(...boundaries) : undefined;
      timer = window.setTimeout(tick, nextBoundary
        ? Math.min(15_000, Math.max(250, nextBoundary - current.getTime() + 50))
        : 15_000);
    };
    tick();
    return () => { if (timer) window.clearTimeout(timer); };
  }, [classes]);

  const query = search.trim().toLowerCase();
  const filteredClasses = classes.filter((cls) =>
    !query || cls.course.toLowerCase().includes(query) || getBatchName(cls.batch).toLowerCase().includes(query)
  );
  const scheduledCount = classes.filter((cls) => cls.status === "scheduled").length;
  const completedCount = classes.filter((cls) => cls.status === "completed").length;

  const handleStart = (classItem: ClassItem) => {
    // Open synchronously to avoid popup blockers, then persist the start
    // marker in the background. The scheduler uses this marker to distinguish
    // a coach-led class from a genuinely missed session.
    if (classItem.meetingLink) window.open(classItem.meetingLink, "_blank", "noopener,noreferrer");
    void startClass(classItem._id).then((response) => {
      if (!response.success) setError(response.error || "Could not record the class start.");
      else setClasses((current) => current.map((item) => item._id === classItem._id ? { ...item, startedAt: response.data?.startedAt || new Date().toISOString() } : item));
    }).catch(() => setError("Could not record the class start. The meeting link was opened; please try again."));
  };

  return (
    <div>
      <PageHeader title="Classes" description="Your regular and cover-up classes for the selected day, with live access timing." />

      {error && (
        <div role="alert" className="admin-alert admin-alert-error flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButtonClass}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Try again
          </button>
        </div>
      )}

      <div className="admin-toolbar items-end">
        <label className="min-w-[170px] text-xs font-semibold text-[var(--color-muted)]">
          Class date
          <input type="date" className="admin-control mt-1" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search classes</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input type="search" placeholder="Search topic or batch" value={search} onChange={(event) => setSearch(event.target.value)} className="admin-control admin-control-search" />
        </label>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
          <span><strong className="text-[var(--color-walnut)]">{filteredClasses.length}</strong> shown</span>
          <span><strong className="text-[var(--color-walnut)]">{scheduledCount}</strong> scheduled</span>
          <span><strong className="text-[var(--color-walnut)]">{completedCount}</strong> completed</span>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButtonClass}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
        </button>
      </div>

      {loading && classes.length === 0 ? (
        <div className="admin-table-shell flex min-h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" aria-label="Loading classes" />
        </div>
      ) : (
        <div className="admin-table-shell">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-5 py-3">
            <p className="text-sm font-bold text-[var(--color-walnut)]">Daily class schedule</p>
            {loading && <span className="text-xs font-semibold text-[var(--color-ember)]">Refreshing…</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[1000px]">
              <caption className="sr-only">Regular and cover-up classes for {selectedDate}</caption>
              <thead>
                <tr>
                  <th className="text-left">Topic</th>
                  <th className="text-left">Batch</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Date & time</th>
                  <th className="text-left">Duration</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Live access</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((cls) => (
                  <tr key={cls._id}>
                    <td className="whitespace-nowrap admin-primary-cell">{cls.course}</td>
                    <td className="whitespace-nowrap">{getBatchName(cls.batch)}</td>
                    <td className="whitespace-nowrap">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${cls.classType === "extra" ? "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]" : "border-[rgba(35,96,75,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]"}`}>
                        {cls.classType === "extra" ? "Cover-up" : "Regular"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-[var(--color-muted)]" />
                        {formatClassDate(cls.date)}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-[var(--color-muted)]" />
                        {cls.startTime}–{cls.endTime}
                        <span className="text-xs text-[var(--color-muted)]">{cls.timezone}</span>
                      </div>
                      {cls.classType === "extra" && cls.extraClassReason && <p className="mt-1 max-w-xs whitespace-normal text-xs text-[var(--color-muted)]">{cls.extraClassReason}</p>}
                    </td>
                    <td className="whitespace-nowrap">{getClassDuration(cls.startTime, cls.endTime)}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {cls.status === "completed" && <CheckCircle className="h-4 w-4 text-[var(--color-pine)]" />}
                        <StatusBadge status={cls.status} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap"><LiveAccess cls={cls} now={now} onStart={handleStart} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredClasses.length === 0 && (
            <div className="admin-empty">
              {query ? `No classes match “${search.trim()}”.` : "No regular or cover-up classes are scheduled for this day."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
