"use client";
 
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, Clock, Plus, RotateCcw } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Modal from "@/components/admin/Modal";
import {
  FormField,
  inputClass,
  selectClass,
  secondaryButtonClass,
  primaryButtonClass,
} from "@/components/admin/FormField";
import {
  getLeads,
  getStaffList,
  getTrialClasses,
  markTrialClassResult,
  rescheduleTrialClass,
  scheduleTrialClass,
  type Lead,
  type StaffMember,
  type TrialClass,
} from "@/lib/adminApi";
import { hasPermission } from "@/lib/auth";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Kolkata",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Muscat",
] as const;

const EMPTY_SCHEDULE = {
  leadId: "",
  coach: "",
  date: "",
  startTime: "",
  endTime: "",
  timezone: "America/New_York",
  meetingLink: "",
};

type TrialResultFormValue = "recommended" | "not_recommended" | "needs_follow_up" | "reschedule_requested";

export default function TrialClassesPage() {
  const canSchedule = hasPermission("schedule_trial");
  const canMarkResult = hasPermission("mark_trial_result");
  const [classes, setClasses] = useState<TrialClass[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [coaches, setCoaches] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [markResultTarget, setMarkResultTarget] = useState<TrialClass | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<TrialClass | null>(null);
  const [resultForm, setResultForm] = useState({
    trialResult: 'recommended' as TrialResultFormValue,
    trialResultNotes: '',
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [classResponse, leadResponse, coachResponse] = await Promise.all([
        getTrialClasses(),
        canSchedule ? getLeads() : Promise.resolve(null),
        canSchedule ? getStaffList("coach") : Promise.resolve(null),
      ]);
      if (classResponse.success) setClasses(classResponse.data);
      else setError(classResponse.error || "Failed to load trial classes");
      if (leadResponse?.success) {
        setLeads(
          leadResponse.data.filter(
            (lead) =>
              !lead.convertedToStudent &&
              lead.status !== "converted" &&
              lead.status !== "lost" &&
              lead.status !== "trial_scheduled"
          )
        );
      }
      if (coachResponse?.success) {
        setCoaches(coachResponse.data.filter((coach) => coach.status === "active"));
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const openReschedule = (trialClass: TrialClass) => {
    setRescheduleTarget(trialClass);
    setScheduleForm({
      leadId: trialClass.leadId?._id || "",
      coach: trialClass.coach._id,
      date: trialClass.date.slice(0, 10),
      startTime: trialClass.startTime,
      endTime: trialClass.endTime,
      timezone: trialClass.timezone,
      meetingLink: trialClass.meetingLink || "",
    });
  };

  const handleReschedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rescheduleTarget) return;
    setError("");
    if (scheduleForm.startTime >= scheduleForm.endTime) {
      setError("Trial end time must be after its start time.");
      return;
    }

    setScheduleSaving(true);
    try {
      const response = await rescheduleTrialClass(rescheduleTarget._id, {
        date: scheduleForm.date,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        timezone: scheduleForm.timezone,
        meetingLink: scheduleForm.meetingLink,
      });
      if (!response.success) {
        setError(response.error || "Failed to reschedule trial class.");
        return;
      }
      setRescheduleTarget(null);
      setScheduleForm(EMPTY_SCHEDULE);
      await load();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setScheduleSaving(false);
    }
  };

  useEffect(() => {
    load();
    // Permission changes remount/revalidate the dashboard shell and this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (scheduleForm.startTime >= scheduleForm.endTime) {
      setError("Trial end time must be after its start time.");
      return;
    }

    setScheduleSaving(true);
    try {
      const response = await scheduleTrialClass(scheduleForm);
      if (!response.success) {
        setError(response.error || "Failed to schedule trial class.");
        return;
      }
      setScheduleOpen(false);
      setScheduleForm(EMPTY_SCHEDULE);
      await load();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleMarkResult = async () => {
    if (!markResultTarget) return;
    try {
      const data = await markTrialClassResult(markResultTarget._id, resultForm);
      if (data.success) {
        setMarkResultTarget(null);
        setResultForm({ trialResult: 'recommended', trialResultNotes: '' });
        await load();
      } else {
        setError(data.error || "Failed to mark trial result");
      }
    } catch {
      setError("Failed to mark trial result");
    }
  };

  const getResultBadge = (result: string) => {
    const badgeBase = "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold";
    switch (result) {
      case 'recommended':
        return <span className={`${badgeBase} border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]`}><CheckCircle className="h-3 w-3" /> Recommended</span>;
      case 'not_recommended':
        return <span className={`${badgeBase} border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]`}><XCircle className="h-3 w-3" /> Not Recommended</span>;
      case 'needs_follow_up':
        return <span className={`${badgeBase} border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]`}><Clock className="h-3 w-3" /> Follow-up</span>;
      case 'reschedule_requested':
        return <span className={`${badgeBase} border-[rgba(31,27,22,0.16)] bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]`}><RotateCcw className="h-3 w-3" /> Reschedule</span>;
      case 'expired':
        return <span className={`${badgeBase} border-[rgba(199,93,60,0.22)] bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)]`}><XCircle className="h-3 w-3" /> Expired</span>;
      default:
        return <span className={`${badgeBase} border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]`}><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const getAttendanceBadge = (status?: TrialClass["trialAttendanceStatus"]) => {
    if (status === "attended") return <span className="text-xs font-bold text-[var(--color-pine-deep)]">Attended</span>;
    if (status === "no_show") return <span className="text-xs font-bold text-[var(--color-ember-deep)]">No-show</span>;
    return <span className="text-xs text-[var(--color-muted)]">Not marked</span>;
  };

  return (
    <div>
      <PageHeader
        title="Trial Classes"
        description="Manage scheduled trial classes and mark results."
        actions={
          canSchedule ? (
            <button
              type="button"
              onClick={() => {
                setScheduleForm(EMPTY_SCHEDULE);
                setScheduleOpen(true);
              }}
              className={primaryButtonClass}
            >
              <Plus className="h-4 w-4" /> Schedule Trial
            </button>
          ) : undefined
        }
      />

      {error && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      <div className="admin-table-shell">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" /></div>
        ) : classes.length === 0 ? (
          <div className="admin-empty">No trial classes scheduled yet</div>
        ) : (
          <table className="admin-table min-w-full">
            <thead>
              <tr>
                <th className="text-left">Student</th>
                <th className="text-left">Coach</th>
                <th className="text-left">Schedule</th>
                <th className="text-left">Meeting Link</th>
                <th className="text-left">Attendance</th>
                <th className="text-left">Result</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls._id}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--color-walnut)]">{cls.leadId?.studentName || 'Unknown'}</p>
                      <p className="text-xs text-[var(--color-muted)]">{cls.leadId?.parentName || ''}</p>
                      <p className="text-xs text-[var(--color-muted)]">{cls.leadId?.email || ''}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">{cls.coach.name}</td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">
                      <p>{new Date(cls.date).toLocaleDateString(undefined, { timeZone: "UTC" })}</p>
                      <p className="text-xs text-[var(--color-muted)]">{cls.startTime} - {cls.endTime} ({cls.timezone})</p>
                      <p className="text-xs text-[var(--color-muted)]">Attempt #{cls.trialAttemptNumber || 1}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {cls.meetingLink ? (
                        <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[var(--color-ember)] hover:underline text-xs">
                          Join Meeting
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">{getAttendanceBadge(cls.trialAttendanceStatus)}</td>
                    <td className="px-5 py-3.5">{getResultBadge(cls.trialResult)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-3">
                        {cls.trialResult === 'pending' && canSchedule && cls.status !== "cancelled" && (
                          <button
                            onClick={() => openReschedule(cls)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-walnut)]"
                          >
                            <RotateCcw className="h-3 w-3" /> Reschedule
                          </button>
                        )}
                        {cls.trialResult === 'pending' && canMarkResult && cls.status !== "cancelled" && (
                          <button
                            onClick={() => setMarkResultTarget(cls)}
                            className="text-[var(--color-ember)] hover:text-[var(--color-ember-deep)] text-xs font-medium"
                          >
                            Mark Result
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      <Modal open={scheduleOpen} onClose={() => !scheduleSaving && setScheduleOpen(false)} title="Schedule Trial Class" maxWidth="max-w-lg">
        <form onSubmit={handleSchedule} className="space-y-4">
          <FormField label="Lead" required>
            <select
              required
              value={scheduleForm.leadId}
              onChange={(event) => setScheduleForm({ ...scheduleForm, leadId: event.target.value })}
              className={selectClass}
            >
              <option value="">Select a lead</option>
              {leads.map((lead) => (
                <option key={lead._id} value={lead._id}>
                  {lead.studentName} · {lead.parentName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Coach" required>
            <select
              required
              value={scheduleForm.coach}
              onChange={(event) => setScheduleForm({ ...scheduleForm, coach: event.target.value })}
              className={selectClass}
            >
              <option value="">Select a coach</option>
              {coaches.map((coach) => (
                <option key={coach._id} value={coach._id}>{coach.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Date" required>
              <input
                required
                type="date"
                value={scheduleForm.date}
                onChange={(event) => setScheduleForm({ ...scheduleForm, date: event.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Start" required>
              <input
                required
                type="time"
                value={scheduleForm.startTime}
                onChange={(event) => setScheduleForm({ ...scheduleForm, startTime: event.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="End" required>
              <input
                required
                type="time"
                value={scheduleForm.endTime}
                onChange={(event) => setScheduleForm({ ...scheduleForm, endTime: event.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Timezone" required>
            <select
              required
              value={scheduleForm.timezone}
              onChange={(event) => setScheduleForm({ ...scheduleForm, timezone: event.target.value })}
              className={selectClass}
            >
              {TIMEZONES.map((timezone) => <option key={timezone}>{timezone}</option>)}
            </select>
          </FormField>
          <FormField label="Meeting Link" required>
            <input
              required
              type="url"
              value={scheduleForm.meetingLink}
              onChange={(event) => setScheduleForm({ ...scheduleForm, meetingLink: event.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </FormField>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={() => setScheduleOpen(false)} disabled={scheduleSaving} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={scheduleSaving || leads.length === 0 || coaches.length === 0} className={primaryButtonClass}>
              {scheduleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Schedule Trial
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!rescheduleTarget} onClose={() => !scheduleSaving && setRescheduleTarget(null)} title="Reschedule Trial Class" maxWidth="max-w-lg">
        <form onSubmit={handleReschedule} className="space-y-4">
          <div className="rounded-xl bg-[var(--color-ivory)] px-4 py-3 text-sm text-[var(--color-muted)]">
            {rescheduleTarget?.leadId?.studentName || "Lead"} with Coach {rescheduleTarget?.coach.name || ""}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Date" required>
              <input
                required
                type="date"
                value={scheduleForm.date}
                onChange={(event) => setScheduleForm({ ...scheduleForm, date: event.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Start" required>
              <input
                required
                type="time"
                value={scheduleForm.startTime}
                onChange={(event) => setScheduleForm({ ...scheduleForm, startTime: event.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="End" required>
              <input
                required
                type="time"
                value={scheduleForm.endTime}
                onChange={(event) => setScheduleForm({ ...scheduleForm, endTime: event.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Timezone" required>
            <select
              required
              value={scheduleForm.timezone}
              onChange={(event) => setScheduleForm({ ...scheduleForm, timezone: event.target.value })}
              className={selectClass}
            >
              {TIMEZONES.map((timezone) => <option key={timezone}>{timezone}</option>)}
            </select>
          </FormField>
          <FormField label="Meeting Link" required>
            <input
              required
              type="url"
              value={scheduleForm.meetingLink}
              onChange={(event) => setScheduleForm({ ...scheduleForm, meetingLink: event.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </FormField>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={() => setRescheduleTarget(null)} disabled={scheduleSaving} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={scheduleSaving} className={primaryButtonClass}>
              {scheduleSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Reschedule Trial
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!markResultTarget} onClose={() => setMarkResultTarget(null)} title="Mark Trial Result" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-walnut)] mb-1.5">Result</label>
            <select 
              value={resultForm.trialResult} 
              onChange={(e) => setResultForm({...resultForm, trialResult: e.target.value as TrialResultFormValue})}
              className={selectClass}
            >
              <option value="recommended">Recommended for Enrollment</option>
              <option value="not_recommended">Not Recommended</option>
              <option value="needs_follow_up">Needs Follow-up</option>
              <option value="reschedule_requested">Reschedule Requested</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-walnut)] mb-1.5">Notes (optional)</label>
            <textarea 
              rows={3}
              value={resultForm.trialResultNotes}
              onChange={(e) => setResultForm({...resultForm, trialResultNotes: e.target.value})}
              className={selectClass}
              placeholder="Add any observations or feedback..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setMarkResultTarget(null)} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleMarkResult} className={primaryButtonClass}>Submit Result</button>
        </div>
      </Modal>
    </div>
  );
}
