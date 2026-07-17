"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, Loader2, Pencil, Plus, SlidersHorizontal, Trophy, XCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Modal from "@/components/admin/Modal";
import StatusBadge from "@/components/admin/StatusBadge";
import { FormField, inputClass, primaryButtonClass, secondaryButtonClass, selectClass } from "@/components/admin/FormField";
import {
  cancelAcademyEvent,
  createMasterclass,
  createTournament,
  getAcademyEvents,
  getStaffList,
  updateAcademyEvent,
  type AcademyEvent,
  type AcademyEventPayload,
  type AcademyEventType,
  type StaffMember,
} from "@/lib/adminApi";

const COUNTRIES = ["US", "CA", "IN", "SA", "AE", "QA", "KW", "BH", "OM"];
const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver", "Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Asia/Kuwait",
  "Asia/Bahrain", "Asia/Muscat",
];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

type EventForm = AcademyEventPayload & { durationMinutes: number };

const emptyForm = (type: AcademyEventType): EventForm => ({
  name: "",
  country: "IN",
  timezone: "Asia/Kolkata",
  date: "",
  startTime: "",
  durationMinutes: 60,
  meetingLink: "",
  ...(type === "masterclass" ? { coach: "", level: "Beginner" } : {}),
});

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export default function AcademyEventManager({ type, title, description }: { type: AcademyEventType; title: string; description: string }) {
  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [coaches, setCoaches] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademyEvent | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AcademyEvent | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [form, setForm] = useState<EventForm>(() => emptyForm(type));
  const [query, setQuery] = useState({ country: "", coach: "", level: "", date: "", status: "" });
  const [draftQuery, setDraftQuery] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const eventResponse = await getAcademyEvents(type);
      if (eventResponse.success) setEvents(eventResponse.data || []);
      else setError(eventResponse.error || "Could not load events");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (type !== "masterclass") return;
    getStaffList("coach").then((response) => {
      if (response.success) setCoaches(response.data || []);
    }).catch(() => setError("Could not load coaches."));
  }, [type]);

  const filteredEvents = useMemo(() => events.filter((event) => (
    (!query.country || event.country === query.country) &&
    (!query.coach || event.coach?._id === query.coach) &&
    (!query.level || event.level === query.level) &&
    (!query.date || event.date.slice(0, 10) === query.date) &&
    (!query.status || event.status === query.status)
  )), [events, query]);
  const activeFilterCount = Object.values(query).filter(Boolean).length;
  const updateDraftQuery = (key: keyof typeof draftQuery, value: string) => {
    setDraftQuery((current) => ({ ...current, [key]: value }));
  };
  const applyFilters = () => {
    setQuery(draftQuery);
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    const cleared = { country: "", coach: "", level: "", date: "", status: "" };
    setDraftQuery(cleared);
    setQuery(cleared);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm(type)); setError(""); setFormOpen(true); };
  const openEdit = (event: AcademyEvent) => {
    setEditing(event);
    setForm({
      name: event.name,
      country: event.country,
      timezone: event.timezone,
      date: event.date.slice(0, 10),
      startTime: event.startTime,
      durationMinutes: event.durationMinutes,
      meetingLink: event.meetingLink || "",
      ...(type === "masterclass" ? { coach: event.coach?._id || "", level: event.level || "Beginner" } : {}),
    });
    setError("");
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = editing
        ? await updateAcademyEvent(type, editing._id, form)
        : type === "masterclass" ? await createMasterclass(form) : await createTournament(form);
      if (!response.success) { setError(response.error || "Could not save event"); return; }
      setFormOpen(false);
      setMessage(editing ? "Event updated successfully." : "Event created and matched to eligible running batches.");
      await load();
    } catch {
      setError("Could not connect to the server.");
    } finally { setSaving(false); }
  };

  const cancel = async (event: AcademyEvent) => {
    setCancelling(true);
    setError("");
    try {
      const response = await cancelAcademyEvent(type, event._id);
      if (!response.success) {
        setError(response.error || "Could not cancel event");
        return;
      }
      setCancelTarget(null);
      setMessage("Event cancelled. Students can no longer join it.");
      await load();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <PageHeader title={title} description={description} actions={<button onClick={openCreate} className={primaryButtonClass}><Plus className="h-4 w-4" /> New {type === "masterclass" ? "Masterclass" : "Tournament"}</button>} />
      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {message && <div className="admin-alert admin-alert-success">{message}</div>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" className={secondaryButtonClass} onClick={() => { setDraftQuery(query); setFiltersOpen((open) => !open); }} aria-expanded={filtersOpen}>
          <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
        {activeFilterCount > 0 && <button type="button" className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-walnut)]" onClick={clearFilters}>Clear all</button>}
        <span className="text-sm text-[var(--color-muted)]">Showing {filteredEvents.length} of {events.length} {type === "masterclass" ? "masterclasses" : "tournaments"}</span>
      </div>
      {filtersOpen && <div className="mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select className="admin-control admin-control-select" value={draftQuery.country} onChange={(e) => updateDraftQuery("country", e.target.value)}><option value="">All countries</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select>
          {type === "masterclass" && <select className="admin-control admin-control-select" value={draftQuery.coach} onChange={(e) => updateDraftQuery("coach", e.target.value)}><option value="">All coaches</option>{coaches.map((coach) => <option key={coach._id} value={coach._id}>{coach.name}</option>)}</select>}
          {type === "masterclass" && <select className="admin-control admin-control-select" value={draftQuery.level} onChange={(e) => updateDraftQuery("level", e.target.value)}><option value="">All levels</option>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>}
          <input type="date" aria-label="Filter by date" className="admin-control" value={draftQuery.date} onChange={(e) => updateDraftQuery("date", e.target.value)} />
          <select className="admin-control admin-control-select" value={draftQuery.status} onChange={(e) => updateDraftQuery("status", e.target.value)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" className={secondaryButtonClass} onClick={clearFilters}>Clear</button>
          <button type="button" className={primaryButtonClass} onClick={applyFilters}>Apply filters</button>
        </div>
      </div>}

      <div className="admin-table-shell">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" /></div> : filteredEvents.length === 0 ? <div className="admin-empty">No {type} history found.</div> : (
          <table className="admin-table min-w-full"><thead><tr><th className="text-left">Name</th>{type === "masterclass" && <th className="text-left">Coach</th>}<th className="text-left">Country / Time zone</th>{type === "masterclass" && <th className="text-left">Level</th>}<th className="text-left">Date & time</th><th className="text-left">Status</th><th className="text-right">Actions</th></tr></thead><tbody>
            {filteredEvents.map((event) => <tr key={event._id}><td className="admin-primary-cell">{event.name}<span className="block text-xs text-[var(--color-muted)]">{event.eligibleBatchCount || 0} eligible batch(es)</span></td>{type === "masterclass" && <td>{event.coach?.name || "—"}</td>}<td>{event.country}<span className="block text-xs text-[var(--color-muted)]">{event.timezone}</span></td>{type === "masterclass" && <td>{event.level || "—"}</td>}<td>{displayDate(event.date)}<span className="block text-xs text-[var(--color-muted)]">{event.startTime}</span></td><td><StatusBadge status={event.status} /></td><td className="text-right"><a href={event.meetingLink} target="_blank" rel="noreferrer" className="admin-icon-button mr-2" aria-label="Open event link"><ExternalLink className="h-4 w-4" /></a>{event.status === "scheduled" && <><button onClick={() => openEdit(event)} className="admin-icon-button mr-2" aria-label="Edit event"><Pencil className="h-4 w-4" /></button><button onClick={() => setCancelTarget(event)} className="admin-icon-button admin-icon-button-danger" aria-label="Cancel event"><XCircle className="h-4 w-4" /></button></>}</td></tr>)}
          </tbody></table>
        )}
      </div>

      <Modal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={editing ? `Edit ${type === "masterclass" ? "Masterclass" : "Tournament"}` : `Create ${type === "masterclass" ? "Masterclass" : "Tournament"}`} maxWidth="max-w-xl">
        <form onSubmit={save} className="space-y-4">
          <FormField label={`${type === "masterclass" ? "Masterclass" : "Tournament"} Name`} required><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2"><FormField label="Country" required><select required className={selectClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select></FormField><FormField label="Time Zone" required><select required className={selectClass} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>{TIMEZONES.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></FormField></div>
          <div className="grid gap-4 sm:grid-cols-2"><FormField label="Date" required><input required type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField><FormField label="Time" required><input required type="time" step="60" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></FormField></div>
          {type === "masterclass" && <div className="grid gap-4 sm:grid-cols-2"><FormField label="Coach" required><select required className={selectClass} value={form.coach || ""} onChange={(e) => setForm({ ...form, coach: e.target.value })}><option value="">Select coach</option>{coaches.map((coach) => <option key={coach._id} value={coach._id}>{coach.name}</option>)}</select></FormField><FormField label="Level" required><select required className={selectClass} value={form.level || "Beginner"} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></FormField></div>}
          <FormField label="Meeting Link" required><input required type="url" className={inputClass} placeholder="https://..." value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} /></FormField>
          <FormField label="Duration (minutes)" required><input required type="number" min={15} max={480} className={inputClass} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></FormField>
          <p className="rounded-xl bg-[var(--color-ivory)] px-3 py-2 text-xs text-[var(--color-muted)]"><Trophy className="mr-1 inline h-3.5 w-3.5" />Eligible running batches are detected automatically by the selected criteria. Manual batch selection is not available.</p>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className={secondaryButtonClass}>Cancel</button><button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}{editing ? "Save changes" : "Create event"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(cancelTarget)} onClose={() => !cancelling && setCancelTarget(null)} title={`Cancel ${type === "masterclass" ? "Masterclass" : "Tournament"}`} maxWidth="max-w-md">
        <div className="space-y-5">
          <p className="text-sm text-[var(--color-walnut)]">Cancel <strong>{cancelTarget?.name}</strong>? Students will no longer be able to join this event. This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCancelTarget(null)} disabled={cancelling} className={secondaryButtonClass}>Keep event</button>
            <button type="button" onClick={() => cancelTarget && void cancel(cancelTarget)} disabled={cancelling} className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[14px] bg-[var(--color-ember)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-ember-deep)] disabled:cursor-not-allowed disabled:opacity-50">{cancelling && <Loader2 className="h-4 w-4 animate-spin" />}Cancel event</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
