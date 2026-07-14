"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Loader2, Search, Users, ArrowRight,
  UserMinus, UserPlus, ChevronDown, CalendarPlus, ExternalLink, MessageCircle
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  dangerButtonClass,
} from "@/components/admin/FormField";
import {
  getBatches,
  createBatch,
  updateBatch,
  renameBatch,
  updateBatchStatus,
  addStudentsToBatch,
  removeStudentFromBatch,
  deleteBatch,
  createExtraClass,
  getStaffList,
  getStudents,
  type Batch,
  type StaffMember,
  type Student,
} from "@/lib/adminApi";
import { hasAnyPermission } from "@/lib/auth";
import {
  COURSE_LEVELS,
  COURSE_SESSION_TOTALS,
  type CourseLevel,
} from "@/lib/courseEnrollment";
import { formatCourseLevel } from "@/lib/labels";
import Link from "next/link";

const BATCH_STATUSES = ["upcoming", "ongoing", "completed"] as const;
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["ongoing", "completed"],
  ongoing: ["completed", "upcoming"],
  completed: [],
};

type BatchFormState = {
  name: string;
  courseLevel: string;
  coach: string;
  students: string[];
  frequencyDays: number[];
  classStartTime: string;
  timezone: string;
  durationValue: string;
  durationUnit: "minutes" | "hours";
  accessOpensMinutesBefore: number;
  startDate: string;
  meetingLink: string;
  notes: string;
  whatsappCommunityLink: string;
};

const EMPTY_FORM: BatchFormState = {
  name: "",
  courseLevel: "Beginner",
  coach: "",
  students: [],
  frequencyDays: [],
  classStartTime: "",
  timezone: "Asia/Kolkata",
  durationValue: "60",
  durationUnit: "minutes",
  accessOpensMinutesBefore: 10,
  startDate: "",
  meetingLink: "",
  notes: "",
  whatsappCommunityLink: "",
};

const WEEKDAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Toronto", "America/Vancouver", "Asia/Riyadh",
  "Asia/Dubai", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain", "Asia/Muscat",
];

type ExtraClassForm = {
  date: string;
  startTime: string;
  timezone: string;
  durationValue: string;
  durationUnit: "minutes" | "hours";
  meetingLink: string;
  reason: string;
};

const EMPTY_EXTRA_FORM: ExtraClassForm = {
  date: "", startTime: "", timezone: "Asia/Kolkata", durationValue: "60",
  durationUnit: "minutes", meetingLink: "", reason: "",
};

function durationInMinutes(value: string, unit: "minutes" | "hours") {
  const numeric = Number(value);
  return Math.round(unit === "hours" ? numeric * 60 : numeric);
}

function DurationPicker({ value, unit, onChange }: {
  value: string;
  unit: "minutes" | "hours";
  onChange: (value: string, unit: "minutes" | "hours") => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_130px]">
      <input required type="number" min={unit === "hours" ? 0.25 : 15} max={unit === "hours" ? 8 : 480} step={unit === "hours" ? 0.25 : 1} value={value} onChange={(e) => onChange(e.target.value, unit)} className={inputClass} />
      <select value={unit} onChange={(e) => onChange(value, e.target.value as "minutes" | "hours")} className={selectClass}>
        <option value="minutes">Minutes</option><option value="hours">Hours</option>
      </select>
    </div>
  );
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [coaches, setCoaches] = useState<StaffMember[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<BatchFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [renameTarget, setRenameTarget] = useState<Batch | null>(null);
  const [renameForm, setRenameForm] = useState({ name: "", courseLevel: "" });
  const [renameSaving, setRenameSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({ coach: "", meetingLink: "", whatsappCommunityLink: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [statusTarget, setStatusTarget] = useState<Batch | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  const [studentsTarget, setStudentsTarget] = useState<Batch | null>(null);
  const [addStudentIds, setAddStudentIds] = useState<string[]>([]);
  const [studentSaving, setStudentSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [extraTarget, setExtraTarget] = useState<Batch | null>(null);
  const [extraForm, setExtraForm] = useState<ExtraClassForm>(EMPTY_EXTRA_FORM);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraError, setExtraError] = useState("");

  const canManage = hasAnyPermission("schedule_classes", "create_edit_class");

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchRes, coachRes, studentRes] = await Promise.all([
        getBatches(),
        getStaffList("coach"),
        getStudents(),
      ]);
      if (batchRes.success) setBatches(batchRes.data);
      else setError(batchRes.error || "Failed to load batches");
      if (coachRes.success) setCoaches(coachRes.data);
      if (studentRes.success) setAllStudents(studentRes.data);
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const reloadBatches = async () => {
    const response = await getBatches();
    if (response.success) setBatches(response.data);
    else setError(response.error || "Failed to refresh batches");
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const matchStatus = !statusFilter || b.status === statusFilter;
      const coachName = typeof b.coach === "object" ? b.coach.name : "";
      const matchSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        coachName.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [batches, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (form.frequencyDays.length === 0) {
      setFormError("Select at least one weekday for the recurring schedule.");
      return;
    }
    const classDurationMinutes = durationInMinutes(form.durationValue, form.durationUnit);
    if (classDurationMinutes < 15 || classDurationMinutes > 480) {
      setFormError("Class duration must be between 15 minutes and 8 hours.");
      return;
    }
    setSaving(true);
    try {
       
      const payload: any = {
        name: form.name,
        courseLevel: form.courseLevel,
        coach: form.coach,
        students: form.students.length > 0 ? form.students : undefined,
        frequencyDays: form.frequencyDays,
        classStartTime: form.classStartTime,
        timezone: form.timezone,
        classDurationMinutes,
        accessOpensMinutesBefore: form.accessOpensMinutesBefore,
        startDate: form.startDate,
        meetingLink: form.meetingLink,
        whatsappCommunityLink: form.whatsappCommunityLink,
        notes: form.notes || undefined,
      };
      const res = await createBatch(payload);
      if (res.success) {
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await reloadBatches();
      } else {
        setFormError(res.error || "Failed to create batch");
      }
    } catch {
      setFormError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    setRenameSaving(true);
    try {
      const res = await renameBatch(renameTarget._id, renameForm.name, renameForm.courseLevel || undefined);
      if (res.success) {
        setRenameTarget(null);
        await reloadBatches();
      }
    } finally {
      setRenameSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const res = await updateBatch(editTarget._id, {
        coach: editForm.coach || undefined,
        meetingLink: editForm.meetingLink || undefined,
        whatsappCommunityLink: editForm.whatsappCommunityLink || undefined,
        notes: editForm.notes || undefined,
      });
      if (res.success) {
        setEditTarget(null);
        await reloadBatches();
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleExtraClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraTarget) return;
    setExtraSaving(true);
    setExtraError("");
    try {
      const response = await createExtraClass(extraTarget._id, {
        date: extraForm.date,
        startTime: extraForm.startTime,
        timezone: extraForm.timezone,
        durationMinutes: durationInMinutes(extraForm.durationValue, extraForm.durationUnit),
        meetingLink: extraForm.meetingLink,
        reason: extraForm.reason || undefined,
        accessOpensMinutesBefore: extraTarget.accessOpensMinutesBefore || 10,
      });
      if (!response.success) {
        setExtraError(response.error || "Failed to schedule extra class");
        return;
      }
      setExtraTarget(null);
      setExtraForm(EMPTY_EXTRA_FORM);
      await reloadBatches();
    } catch (error) {
      setExtraError(error instanceof Error ? error.message : "Could not connect to the server.");
    } finally {
      setExtraSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    setStatusSaving(true);
    try {
      const res = await updateBatchStatus(statusTarget._id, newStatus);
      if (res.success) {
        setStatusTarget(null);
        await reloadBatches();
      }
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAddStudents = async () => {
    if (!studentsTarget || addStudentIds.length === 0) return;
    setStudentSaving(true);
    try {
      const res = await addStudentsToBatch(studentsTarget._id, addStudentIds);
      if (res.success) {
        setAddStudentIds([]);
        const merged = { ...studentsTarget, students: res.data.students, studentCount: res.data.students.length };
        setStudentsTarget(merged);
        setBatches((current) => current.map((batch) => batch._id === merged._id ? merged : batch));
      }
    } finally {
      setStudentSaving(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!studentsTarget) return;
    try {
      const res = await removeStudentFromBatch(studentsTarget._id, studentId);
      if (res.success) {
        const merged = { ...studentsTarget, students: res.data.students, studentCount: res.data.students.length };
        setStudentsTarget(merged);
        setBatches((current) => current.map((batch) => batch._id === merged._id ? merged : batch));
      }
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteBatch(deleteTarget._id);
      if (res.success) {
        setBatches((prev) => prev.filter((b) => b._id !== deleteTarget._id));
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const studentsNotInBatch = useMemo(() => {
    if (!studentsTarget) return [];
    const existing = new Set(studentsTarget.students.map((s) => (typeof s === "object" ? s._id : String(s))));
    return allStudents.filter((s) => !existing.has(s._id));
  }, [studentsTarget, allStudents]);

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Manage student batches, assign coaches, and track batch progress."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/batches/history"
              className={secondaryButtonClass}
            >
              History
            </Link>
            {canManage && (
              <button onClick={() => { setForm(EMPTY_FORM); setFormError(""); setCreateOpen(true); }} className={primaryButtonClass}>
                <Plus className="h-4 w-4" /> New Batch
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or coach..."
            className={inputClass + " pl-10"}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass + " w-auto"}>
          <option value="">All statuses</option>
          {BATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      <div className="admin-table-shell">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No batches found</div>
        ) : (
          <table className="admin-table min-w-full">
            <thead>
              <tr>
                <th className="text-left">Batch</th>
                <th className="text-left">Level</th>
                <th className="text-left">Coach</th>
                <th className="text-left">Next Class</th>
                <th className="text-left">Students</th>
                <th className="text-left">Course Sessions</th>
                <th className="text-left">Status</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((batch) => (
                <tr key={batch._id}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--color-walnut)]">{batch.name}</p>
                      {batch.schedule && <p className="text-xs text-[var(--color-muted)] mt-0.5">{batch.schedule}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                        {batch.meetingLink && <a href={batch.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-pine-deep)] hover:underline"><ExternalLink className="h-3 w-3" /> Meeting</a>}
                        {batch.whatsappCommunityLink && <a href={batch.whatsappCommunityLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-pine-deep)] hover:underline"><MessageCircle className="h-3 w-3" /> WhatsApp</a>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">{formatCourseLevel(batch.courseLevel)}</td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">
                      {typeof batch.coach === "object" ? batch.coach.name : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-walnut)]">
                      {batch.nextUpcomingClass ? <><p>{new Date(batch.nextUpcomingClass.date).toLocaleDateString(undefined, { timeZone: "UTC" })}</p><p className="mt-0.5 text-[var(--color-muted)]">{batch.nextUpcomingClass.startTime} · {batch.nextUpcomingClass.timezone}</p></> : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => { setStudentsTarget(batch); setAddStudentIds([]); }}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-pine-deep)] hover:underline"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {batch.students?.length ?? 0} student{batch.students?.length !== 1 ? "s" : ""}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="min-w-28 text-xs">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="font-medium text-[var(--color-walnut)]">
                            {batch.sessionsCompleted ?? 0} / {batch.totalSessions ?? COURSE_SESSION_TOTALS[batch.courseLevel]}
                          </span>
                          <span className="text-[var(--color-muted)]">sessions</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-pine)]"
                            style={{
                              width: `${Math.min(
                                100,
                                ((batch.sessionsCompleted ?? 0) /
                                  (batch.totalSessions ?? COURSE_SESSION_TOTALS[batch.courseLevel])) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setRenameTarget(batch);
                                setRenameForm({ name: batch.name, courseLevel: batch.courseLevel });
                              }}
                              title="Rename"
                              className="text-[var(--color-muted)] hover:text-[var(--color-walnut)] p-1.5"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditTarget(batch);
                                setEditForm({
                                  coach: typeof batch.coach === "object" ? batch.coach._id : "",
                                  meetingLink: batch.meetingLink || "",
                                  whatsappCommunityLink: batch.whatsappCommunityLink || "",
                                  notes: batch.notes || "",
                                });
                              }}
                              title="Edit details"
                              className="text-[var(--color-muted)] hover:text-[var(--color-walnut)] p-1.5"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            {batch.status !== "completed" && (
                              <button onClick={() => {
                                setExtraTarget(batch);
                                setExtraForm({ ...EMPTY_EXTRA_FORM, timezone: batch.timezone || "Asia/Kolkata", meetingLink: batch.meetingLink || "" });
                                setExtraError("");
                              }} title="Schedule extra class" className="text-[var(--color-muted)] hover:text-[var(--color-walnut)] p-1.5">
                                <CalendarPlus className="h-4 w-4" />
                              </button>
                            )}
                            {batch.status !== "completed" && (
                              <button
                                onClick={() => {
                                  setStatusTarget(batch);
                                  setNewStatus(ALLOWED_TRANSITIONS[batch.status]?.[0] || "");
                                }}
                                title="Change status"
                                className="text-[var(--color-muted)] hover:text-[var(--color-walnut)] p-1.5"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(batch)}
                              title="Delete"
                              className="text-[var(--color-muted)] hover:text-[var(--color-ember-deep)] p-1.5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      {/* Create Batch Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Batch" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">{formError}</div>}

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Batch Name" required>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Batch A" />
            </FormField>
            <FormField label="Course Level" required>
              <select required value={form.courseLevel} onChange={(e) => setForm({ ...form, courseLevel: e.target.value })} className={selectClass}>
                {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </FormField>
          </div>

          <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-ivory)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--color-walnut)]">
              {COURSE_SESSION_TOTALS[form.courseLevel as CourseLevel]} numbered sessions
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              The full session list is generated automatically for this course level.
            </p>
          </div>

          <FormField label="Assign Coach" required>
            <select required value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} className={selectClass}>
              <option value="">— Select coach —</option>
              {coaches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </FormField>

          <FormField label="Batch Frequency" required>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map((day) => {
                const selected = form.frequencyDays.includes(day.value);
                return <button key={day.value} type="button" aria-pressed={selected} onClick={() => setForm({
                  ...form,
                  frequencyDays: selected ? form.frequencyDays.filter((value) => value !== day.value) : [...form.frequencyDays, day.value],
                })} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${selected ? "border-[var(--color-pine)] bg-[var(--color-pine)] text-white" : "border-[var(--color-line)] bg-white text-[var(--color-walnut)]"}`}>{day.label}</button>;
              })}
            </div>
            {form.frequencyDays.length === 0 && <p className="mt-1 text-xs text-[var(--color-muted)]">Select at least one class day.</p>}
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Class Start Time" required>
              <input required type="time" step="60" value={form.classStartTime} onChange={(e) => setForm({ ...form, classStartTime: e.target.value })} className={inputClass} />
              <p className="mt-1 text-xs text-[var(--color-muted)]">Minutes are supported, e.g. 10:05 AM or 5:30 PM.</p>
            </FormField>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Time Zone" required>
              <select required value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={selectClass}>
                {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
              </select>
            </FormField>
            <FormField label="Maximum Class Duration" required>
              <DurationPicker value={form.durationValue} unit={form.durationUnit} onChange={(durationValue, durationUnit) => setForm({ ...form, durationValue, durationUnit })} />
            </FormField>
          </div>

          <FormField label="Live Buttons Appear" required>
            <select value={form.accessOpensMinutesBefore} onChange={(e) => setForm({ ...form, accessOpensMinutesBefore: Number(e.target.value) })} className={selectClass}>
              <option value={5}>5 minutes before class</option><option value={10}>10 minutes before class</option>
            </select>
          </FormField>

          <FormField label="Initial Students">
            <select
              multiple
              value={form.students}
              onChange={(e) => setForm({ ...form, students: Array.from(e.target.selectedOptions as HTMLCollectionOf<HTMLOptionElement>).map((o) => o.value) })}
              className={selectClass + " h-32"}
            >
              {allStudents.map((s) => <option key={s._id} value={s._id}>{s.studentName}</option>)}
            </select>
            <p className="text-xs text-[var(--color-muted)] mt-1">Hold Ctrl/Cmd to select multiple.</p>
          </FormField>

          <FormField label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={textareaClass} rows={2} />
          </FormField>

          <FormField label="Meeting Link" required>
            <input required type="url" value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} className={inputClass} placeholder="https://meet.google.com/..." />
            <p className="text-xs text-[var(--color-muted)] mt-1">Used automatically for every recurring class unless that class is edited.</p>
          </FormField>

          <FormField label="WhatsApp Group Link" required>
            <input 
              required
              type="url" 
              value={form.whatsappCommunityLink} 
              onChange={(e) => setForm({ ...form, whatsappCommunityLink: e.target.value })} 
              className={inputClass} 
              placeholder="https://chat.whatsapp.com/..." 
            />
            <p className="text-xs text-[var(--color-muted)] mt-1">This link will be shared with all students in this batch via email and dashboard.</p>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Batch
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename Batch" maxWidth="max-w-md">
        <form onSubmit={handleRename} className="space-y-4">
          <FormField label="Batch Name" required>
            <input required value={renameForm.name} onChange={(e) => setRenameForm({ ...renameForm, name: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Course Level">
            <select value={renameForm.courseLevel} onChange={(e) => setRenameForm({ ...renameForm, courseLevel: e.target.value })} className={selectClass}>
              {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setRenameTarget(null)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={renameSaving} className={primaryButtonClass}>
              {renameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Batch Details" maxWidth="max-w-md">
        <form onSubmit={handleEdit} className="space-y-4">
          <FormField label="Assign Coach">
            <select value={editForm.coach} onChange={(e) => setEditForm({ ...editForm, coach: e.target.value })} className={selectClass}>
              <option value="">— Keep current —</option>
              {coaches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Default Meeting Link">
            <input type="url" value={editForm.meetingLink} onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })} className={inputClass} />
            <p className="mt-1 text-xs text-[var(--color-muted)]">Updates future generated classes that still use the batch link.</p>
          </FormField>
          <FormField label="WhatsApp Group Link">
            <input type="url" value={editForm.whatsappCommunityLink} onChange={(e) => setEditForm({ ...editForm, whatsappCommunityLink: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Notes">
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className={textareaClass} rows={2} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditTarget(null)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={editSaving} className={primaryButtonClass}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Modal */}
      <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title="Update Batch Status" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Current status: <StatusBadge status={statusTarget?.status || ""} />
          </p>
          <FormField label="New Status">
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={selectClass}>
              {(ALLOWED_TRANSITIONS[statusTarget?.status || ""] || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setStatusTarget(null)} className={secondaryButtonClass}>Cancel</button>
            <button onClick={handleStatusUpdate} disabled={statusSaving} className={primaryButtonClass}>
              {statusSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update
            </button>
          </div>
        </div>
      </Modal>

      {/* Students Modal */}
      <Modal open={!!studentsTarget} onClose={() => setStudentsTarget(null)} title={`Students — ${studentsTarget?.name}`} maxWidth="max-w-lg">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">Current Students</p>
            {(studentsTarget?.students?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No students yet.</p>
            ) : (
              <div className="space-y-1.5">
                {studentsTarget?.students.map((s) => {
                  const id = typeof s === "object" ? s._id : String(s);
                  const name = typeof s === "object" ? s.studentName : id;
                  return (
                    <div key={id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--color-ivory)] text-sm">
                      <span className="text-[var(--color-walnut)]">{name}</span>
                      {canManage && studentsTarget?.status !== "completed" && (
                        <button onClick={() => handleRemoveStudent(id)} className="text-[var(--color-ember-deep)] hover:opacity-80 p-1" title="Remove">
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {studentsTarget?.status === "completed" && (
            <p className="rounded-xl bg-[var(--color-ivory)] px-4 py-3 text-sm text-[var(--color-muted)]">
              This completed batch roster is locked to preserve its class history.
            </p>
          )}

          {canManage && studentsTarget?.status !== "completed" && studentsNotInBatch.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">Add Students</p>
              <select
                multiple
                value={addStudentIds}
                onChange={(e) => setAddStudentIds(Array.from(e.target.selectedOptions as HTMLCollectionOf<HTMLOptionElement>).map((o) => o.value))}
                className={selectClass + " h-28"}
              >
                {studentsNotInBatch.map((s) => <option key={s._id} value={s._id}>{s.studentName}</option>)}
              </select>
              <p className="text-xs text-[var(--color-muted)] mt-1">Hold Ctrl/Cmd to select multiple.</p>
              <div className="flex justify-end mt-3">
                <button onClick={handleAddStudents} disabled={studentSaving || addStudentIds.length === 0} className={primaryButtonClass}>
                  {studentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Add Selected
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Extra Class Modal */}
      <Modal open={!!extraTarget} onClose={() => setExtraTarget(null)} title={`Schedule Extra Class — ${extraTarget?.name || ""}`} maxWidth="max-w-xl">
        <form onSubmit={handleExtraClass} className="space-y-4">
          {extraError && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">{extraError}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Date" required><input required type="date" value={extraForm.date} onChange={(e) => setExtraForm({ ...extraForm, date: e.target.value })} className={inputClass} /></FormField>
            <FormField label="Time" required>
              <input required type="time" step="60" value={extraForm.startTime} onChange={(e) => setExtraForm({ ...extraForm, startTime: e.target.value })} className={inputClass} />
              <p className="mt-1 text-xs text-[var(--color-muted)]">Any minute value is supported, including :05 and :30.</p>
            </FormField>
          </div>
          <FormField label="Time Zone" required>
            <select required value={extraForm.timezone} onChange={(e) => setExtraForm({ ...extraForm, timezone: e.target.value })} className={selectClass}>{TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select>
          </FormField>
          <FormField label="Duration" required><DurationPicker value={extraForm.durationValue} unit={extraForm.durationUnit} onChange={(durationValue, durationUnit) => setExtraForm({ ...extraForm, durationValue, durationUnit })} /></FormField>
          <FormField label="Meeting Link" required><input required type="url" value={extraForm.meetingLink} onChange={(e) => setExtraForm({ ...extraForm, meetingLink: e.target.value })} className={inputClass} placeholder="https://meet.google.com/..." /></FormField>
          <FormField label="Reason / Description"><textarea value={extraForm.reason} onChange={(e) => setExtraForm({ ...extraForm, reason: e.target.value })} className={textareaClass} rows={3} placeholder="Holiday compensation, revision session, technical issue…" /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setExtraTarget(null)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={extraSaving} className={primaryButtonClass}>{extraSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Schedule Extra Class</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Batch" maxWidth="max-w-sm">
        <p className="text-sm text-[var(--color-walnut)] mb-5">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleDelete} className={dangerButtonClass}>Delete</button>
        </div>
      </Modal>

    </div>
  );
}
