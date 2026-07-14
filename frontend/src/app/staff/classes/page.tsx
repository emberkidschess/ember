"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Calendar, Clock, CheckCircle, Video, MessageCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getClasses, type ClassItem } from "@/lib/adminApi";

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

function StartClassButton({ cls, now }: { cls: ClassItem; now: Date }) {
  if (!cls.accessOpensAt || !cls.accessClosesAt || !cls.meetingLink || cls.status !== "scheduled") return null;
  if (now < new Date(cls.accessOpensAt) || now > new Date(cls.accessClosesAt)) return null;
  return (
    <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ember)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
      <Video className="h-3.5 w-3.5" /> Start Now
    </a>
  );
}

export default function StaffClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());

  const load = async () => {
    setLoading(true);
    try {
      const data = await getClasses({ status: "scheduled" });
      if (data.success) {
        setClasses(data.data || []);
      } else {
        setError(data.error || "Failed to load classes");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const filteredClasses = classes.filter(
    (cls) =>
      cls.course.toLowerCase().includes(search.toLowerCase()) ||
      getBatchName(cls.batch).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        description="View and manage scheduled classes"
      />

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      <div className="admin-toolbar">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-control admin-control-search"
          />
        </div>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table min-w-[800px]">
          <thead>
            <tr>
              <th className="text-left">Topic</th>
              <th className="text-left">Batch</th>
              <th className="text-left">Date & Time</th>
              <th className="text-left">Duration</th>
              <th className="text-left">Status</th>
              <th className="text-left">Live Access</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map((cls) => (
              <tr key={cls._id}>
                <td className="whitespace-nowrap admin-primary-cell">{cls.course}</td>
                <td className="whitespace-nowrap">{getBatchName(cls.batch)}</td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {new Date(cls.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Clock className="h-4 w-4" />
                    {cls.startTime}–{cls.endTime} {cls.timezone}
                  </div>
                  {cls.classType === "extra" && cls.extraClassReason && (
                    <p className="mt-1 max-w-xs whitespace-normal text-xs text-[var(--color-muted)]">{cls.extraClassReason}</p>
                  )}
                </td>
                <td className="whitespace-nowrap">{getClassDuration(cls.startTime, cls.endTime)}</td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {cls.status === "completed" && <CheckCircle className="h-4 w-4 text-[var(--color-pine)]" />}
                    <StatusBadge status={cls.status} />
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <StartClassButton cls={cls} now={now} />
                    {typeof cls.batch === "object" && cls.batch?.whatsappCommunityLink && (
                      <a href={cls.batch.whatsappCommunityLink} target="_blank" rel="noreferrer" title="Open WhatsApp group" className="rounded-lg border border-[var(--color-line)] p-2 text-[var(--color-pine-deep)] hover:bg-[var(--color-ivory)]">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClasses.length === 0 && (
          <div className="admin-empty">No classes found</div>
        )}
      </div>
    </div>
  );
}
