"use client";
 
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Modal from "@/components/admin/Modal";
import {
  FormField,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  dangerButtonClass,
} from "@/components/admin/FormField";
import { getDisputedAttendance, resolveDispute, type AttendanceItem } from "@/lib/adminApi";
import { hasPermission } from "@/lib/auth";

export default function AttendanceDisputesPage() {
  const [disputes, setDisputes] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [target, setTarget] = useState<AttendanceItem | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const canResolve = hasPermission("resolve_attendance_dispute");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDisputedAttendance();
      if (res.success) setDisputes(res.data || []);
      else setError(res.error || "Failed to load disputes.");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openResolve = (item: AttendanceItem, d: "approve" | "reject") => {
    setTarget(item);
    setDecision(d);
    setNotes("");
  };

  const handleResolve = async () => {
    if (!target || !decision) return;
    setSaving(true);
    try {
      const res = await resolveDispute(target._id, decision === "approve", notes || undefined);
      if (res.success) {
        setTarget(null);
        setDecision(null);
        setSuccessMsg(decision === "approve" ? "Dispute approved — marked present." : "Dispute rejected — remains absent.");
        setTimeout(() => setSuccessMsg(""), 4000);
        await load();
      } else {
        setError(res.error || "Failed to resolve dispute.");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance Disputes"
        description="Students who joined a class but forgot to click Join Now — review and correct their attendance."
      />

      {successMsg && (
        <div className="admin-alert admin-alert-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-[var(--color-ember)] animate-spin" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] p-12 text-center text-[var(--color-muted)]">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
          No pending disputes. Nice and clear.
        </div>
      ) : (
        <div className="grid gap-3">
          {disputes.map((d) => (
            <div key={d._id} className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-[var(--color-walnut)]">{d.student?.studentName}</div>
                  <div className="text-sm text-[var(--color-muted)] mt-0.5">
                    {d.class?.course} · {d.class?.date ? new Date(d.class.date).toLocaleDateString(undefined, { timeZone: "UTC" }) : ""} · {d.class?.startTime}–{d.class?.endTime}
                  </div>
                  {d.disputeReason && (
                    <div className="mt-2 text-sm bg-[var(--color-ivory)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-[var(--color-walnut)]">
                      "{d.disputeReason}"
                    </div>
                  )}
                  {d.disputeRaisedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] mt-2">
                      <Clock className="h-3 w-3" /> Raised {new Date(d.disputeRaisedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {canResolve && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openResolve(d, "reject")} className={secondaryButtonClass}>
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button onClick={() => openResolve(d, "approve")} className={primaryButtonClass}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => { setTarget(null); setDecision(null); }}
        title={decision === "approve" ? "Approve Dispute" : "Reject Dispute"}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            {decision === "approve"
              ? `${target?.student?.studentName} will be marked present, and a class credit will be deducted from their package.`
              : `${target?.student?.studentName} will remain marked absent.`}
          </p>
          <FormField label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} rows={2} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setTarget(null); setDecision(null); }} className={secondaryButtonClass}>Cancel</button>
            <button
              type="button"
              onClick={handleResolve}
              disabled={saving}
              className={decision === "approve" ? primaryButtonClass : dangerButtonClass}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : decision === "approve" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {decision === "approve" ? "Approve" : "Reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
