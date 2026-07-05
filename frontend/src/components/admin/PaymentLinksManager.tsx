"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Loader2, CheckCircle2, Mail, MessageCircle, Link as LinkIcon, Check, DollarSign } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import { FormField, inputClass, selectClass, primaryButtonClass, secondaryButtonClass } from "@/components/admin/FormField";
import {
  getPaymentLinks,
  createPaymentLink,
  sendPaymentLink,
  markPaymentReceived,
  activatePackage,
  getStaffList,
  getBatches,
  getStudents,
  getLeads,
  type PaymentLink,
  type StaffMember,
  type Student,
  type Lead,
  type Batch,
} from "@/lib/adminApi";
import { formatCurrency } from "@/lib/currency";
import { hasPermission } from "@/lib/auth";
import {
  COURSE_LEVELS,
  PLAN_LABELS,
  getAllowedSessionPlans,
  type CourseLevel,
} from "@/lib/courseEnrollment";

const PURPOSES = ["new_package", "renewal", "upgrade"];

function contactNameOf(link: PaymentLink): string {
  if (link.purpose === "new_package") {
    return typeof link.lead === "object" ? link.lead?.studentName || "—" : "—";
  }
  return typeof link.student === "object" ? link.student?.studentName || "—" : "—";
}

function PaymentLinksContent() {
  const searchParams = useSearchParams();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    purpose: "new_package",
    lead: "",
    student: "",
    amount: "",
    currency: "INR",
    packageType: "10 Sessions",
    courseLevel: "Beginner",
    previousPackageId: "",
    notes: "",
  });
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState<(PaymentLink & { contact?: { name: string; email: string; phone: string } }) | null>(null);

  const [sendTarget, setSendTarget] = useState<PaymentLink | null>(null);
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState<string[]>([]);
  const [sendError, setSendError] = useState("");

  const [markPaidTarget, setMarkPaidTarget] = useState<PaymentLink | null>(null);
  const [markPaidReference, setMarkPaidReference] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markPaidError, setMarkPaidError] = useState("");

  const [activateTarget, setActivateTarget] = useState<PaymentLink | null>(null);
  const [activateForm, setActivateForm] = useState({ assignedCoach: "", batch: "", schedule: "" });
  const [activateError, setActivateError] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  const canSend = hasPermission("send_payment_link");
  const canMarkPaid = hasPermission("mark_payment_received");
  const canEnroll = hasPermission("enroll_student");
  const canGenerate = hasPermission("generate_payment_link");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [linksRes, staffRes, studentsRes, leadsRes, batchesRes] = await Promise.all([
        getPaymentLinks(),
        getStaffList("coach"),
        getStudents(),
        getLeads(),
        getBatches(),
      ]);
      if (linksRes.success) setLinks(linksRes.data);
      else setError(linksRes.error || "Failed to load payment links");
      if (staffRes.success) setStaff(staffRes.data);
      if (studentsRes.success) setStudents(studentsRes.data);
      if (leadsRes.success) setLeads(leadsRes.data);
      if (batchesRes.success) setBatches(batchesRes.data);
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Kick off data load once on mount — calling an async function from the
  // effect body rather than calling setState directly avoids the lint warning.
  useEffect(() => {
    loadData();
     
  }, []);

  // Derive activateTarget from URL param + loaded links so we don't need
  // a separate useEffect that calls setState synchronously.
  useEffect(() => {
    const activateId = searchParams.get("activate");
    if (!canEnroll || !activateId || links.length === 0) return;
    const link = links.find((l) => l._id === activateId);
    if (link) {
      // Schedule the state update in a microtask to avoid the "setState during
      // render" eslint rule while still reacting to the param change.
      Promise.resolve().then(() => setActivateTarget(link));
    }
  }, [searchParams, links, canEnroll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.packageType) {
      setCreateError("A session plan is required.");
      return;
    }
    setSaving(true);

    try {
      const payload: any = {
        purpose: createForm.purpose,
        amount: Number(createForm.amount),
        currency: createForm.currency,
        packageType: createForm.packageType,
        courseLevel: createForm.courseLevel,
        notes: createForm.notes,
      };
      if (createForm.purpose === "new_package") {
        payload.lead = createForm.lead;
      } else {
        payload.student = createForm.student;
      }

      const res = await createPaymentLink(payload);
      if (res.success) {
        setCreateOpen(false);
        setCreatedLink(res.data);
        setCreateForm({ purpose: "new_package", lead: "", student: "", amount: "", currency: "INR", packageType: "10 Sessions", courseLevel: "Beginner", previousPackageId: "", notes: "" });
        loadData();
      } else {
        setCreateError(res.error || "Failed to create payment link");
      }
    } catch {
      setCreateError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const openSend = (link: PaymentLink) => {
    setSendTarget(link);
    setSendDone([]);
    setSendError("");
  };

  const openMarkPaid = (link: PaymentLink) => {
    setMarkPaidTarget(link);
    setMarkPaidReference("");
    setMarkPaidError("");
  };

  const closeMarkPaid = () => {
    setMarkPaidTarget(null);
    setMarkPaidReference("");
    setMarkPaidError("");
  };

  const handleSend = async (channel: "email" | "whatsapp" | "copy_link") => {
    if (!sendTarget) return;

    setSendError("");
    setSending(true);
    try {
      if (channel === "copy_link") {
        const url = sendTarget.shareableUrl || `${window.location.origin}/pay/${sendTarget._id}`;
        await navigator.clipboard.writeText(url);
      }

      const res = await sendPaymentLink(sendTarget._id, [channel]);
      if (res.success) {
        setSendDone((previous) =>
          previous.includes(channel) ? previous : [...previous, channel]
        );
        void loadData();
      } else setSendError(res.error || "Could not share the payment link.");
    } catch (sendFailure) {
      setSendError(
        sendFailure instanceof Error
          ? sendFailure.message
          : "Could not share the payment link."
      );
    } finally {
      setSending(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markPaidTarget) return;
    setMarkPaidError("");
    setMarkingPaid(true);
    try {
      const res = await markPaymentReceived(markPaidTarget._id, markPaidReference || undefined);
      if (res.success) {
        closeMarkPaid();
        void loadData();
      } else setMarkPaidError(res.error || "Could not mark this payment as received.");
    } catch (markFailure) {
      setMarkPaidError(
        markFailure instanceof Error
          ? markFailure.message
          : "Could not mark this payment as received."
      );
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateTarget) return;
    setActivateError("");
    setActivating(true);

    try {
      const res = await activatePackage(activateTarget._id, activateForm);
      if (res.success) {
        setActivationSuccess(true);
        loadData();
      } else {
        setActivateError(res.error || "Failed to activate package");
      }
    } catch {
      setActivateError("Could not connect to the server.");
    } finally {
      setActivating(false);
    }
  };

  const closeActivateModal = () => {
    setActivateTarget(null);
    setActivateForm({ assignedCoach: "", batch: "", schedule: "" });
    setActivationSuccess(false);
    setActivateError("");
  };

  const getBatchCoachId = (batch: Batch) => typeof batch.coach === "string" ? batch.coach : batch.coach._id;
  const getBatchCoachName = (batch: Batch) => typeof batch.coach === "string" ? "Assigned coach" : batch.coach.name;
  const availableActivationBatches = batches.filter(
    (batch) => batch.status !== "completed" && (!activateTarget?.courseLevel || batch.courseLevel === activateTarget.courseLevel)
  );
  const eligibleStudents = students.filter((student) => {
    if (typeof student.currentPackageId !== "object") return false;
    const currentLevel = student.currentPackageId.courseLevel === "Master"
      ? "Expert"
      : student.currentPackageId.courseLevel;
    return createForm.purpose !== "upgrade" || currentLevel !== "Expert";
  });

  const selectEnrollmentStudent = (studentId: string) => {
    const selectedStudent = students.find((student) => student._id === studentId);
    const currentPackage =
      selectedStudent && typeof selectedStudent.currentPackageId === "object"
        ? selectedStudent.currentPackageId
        : null;
    const currentLevel = currentPackage?.courseLevel === "Master"
      ? "Expert"
      : currentPackage?.courseLevel;
    const currentIndex = currentLevel
      ? COURSE_LEVELS.indexOf(currentLevel as CourseLevel)
      : -1;
    const courseLevel =
      createForm.purpose === "upgrade"
        ? COURSE_LEVELS[currentIndex + 1] || "Expert"
        : (currentLevel as CourseLevel | undefined) || "Beginner";
    const allowedPlans = getAllowedSessionPlans(courseLevel);
    const packageType = allowedPlans.some(
      (size) => PLAN_LABELS[size] === createForm.packageType
    )
      ? createForm.packageType
      : PLAN_LABELS[allowedPlans[0]];

    setCreateForm({ ...createForm, student: studentId, courseLevel, packageType });
  };

  return (
    <div>
      <PageHeader
        title="Payment Links"
        description="Create payment links for new enrollments, renewals, and upgrades. Enrolling a paid link creates the student's dashboard login."
        actions={
          canGenerate ? (
            <button onClick={() => setCreateOpen(true)} className={primaryButtonClass}>
              <Plus className="h-4 w-4" /> New Payment Link
            </button>
          ) : undefined
        }
      />

      {error && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-[var(--color-ember)] animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-center py-16 text-sm text-[var(--color-muted)]">No payment links yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Package</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {links.map((link) => (
                  <tr key={link._id} className="hover:bg-[var(--color-ivory)]/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[var(--color-walnut)]">
                      {contactNameOf(link)}
                      <span className="ml-2 text-[10px] font-bold uppercase text-[var(--color-muted)]">
                        {link.purpose === "new_package" ? "New" : link.purpose}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-muted)]">{link.packageType || "—"} · {link.courseLevel}</td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">{formatCurrency(link.amount, link.currency)}</td>
                    <td className="px-5 py-3.5 text-[var(--color-muted)]">Wise</td>
                    <td className="px-5 py-3.5"><StatusBadge status={link.status} /></td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {link.status === "active" && canSend && (
                        <button onClick={() => openSend(link)} className="text-xs font-bold uppercase tracking-wide text-[var(--color-walnut)] hover:text-[var(--color-ember)] mr-3">
                          Send
                        </button>
                      )}
                      {link.status === "active" && canMarkPaid && (
                        <button onClick={() => openMarkPaid(link)} className="text-xs font-bold uppercase tracking-wide text-[var(--color-pine-deep)] hover:text-[var(--color-pine)] mr-3">
                          Mark Paid
                        </button>
                      )}
                      {link.status === "waiting_for_activation" && canEnroll && (
                        <button
                          onClick={() => setActivateTarget(link)}
                          className="text-xs font-bold uppercase tracking-wide text-[var(--color-ember)] hover:text-[var(--color-ember-deep)]"
                        >
                          Enroll
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Payment Link" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">{createError}</div>}

          <FormField label="Purpose" required>
            <select
              value={createForm.purpose}
              onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value, lead: "", student: "" })}
              className={selectClass}
            >
              {PURPOSES.map((p) => <option key={p} value={p}>{p === "new_package" ? "New Enrollment" : p}</option>)}
            </select>
          </FormField>

          {createForm.purpose === "new_package" ? (
            <FormField label="Lead" required hint="Only un-converted leads appear here.">
              <select required value={createForm.lead} onChange={(e) => setCreateForm({ ...createForm, lead: e.target.value })} className={selectClass}>
                <option value="">Select a lead...</option>
                {leads.map((l) => (
                  <option key={l._id} value={l._id}>{l.studentName} ({l.parentName})</option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField label="Student" required>
              <select required value={createForm.student} onChange={(e) => selectEnrollmentStudent(e.target.value)} className={selectClass}>
                <option value="">Select a student...</option>
                {eligibleStudents.map((s) => (
                  <option key={s._id} value={s._id}>{s.studentName} ({s.parentName})</option>
                ))}
              </select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount" required>
              <input required type="number" min={1} value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Currency">
              <select
                value={createForm.currency}
                onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                className={selectClass}
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="INR">INR</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
                <option value="QAR">QAR</option>
                <option value="KWD">KWD</option>
                <option value="BHD">BHD</option>
                <option value="OMR">OMR</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Session Plan" required>
              <select
                required
                value={createForm.packageType}
                onChange={(e) => setCreateForm({ ...createForm, packageType: e.target.value })}
                className={selectClass}
              >
                {getAllowedSessionPlans(createForm.courseLevel as CourseLevel).map((size) => (
                  <option key={size} value={PLAN_LABELS[size]}>{PLAN_LABELS[size]}</option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Course Level"
              hint={createForm.purpose === "renewal"
                ? "Renewals stay on the current level."
                : createForm.purpose === "upgrade"
                  ? "Upgrades move to the next level."
                  : undefined}
            >
              <select
                value={createForm.courseLevel}
                disabled={createForm.purpose !== "new_package"}
                onChange={(e) => {
                  const courseLevel = e.target.value as CourseLevel;
                  const allowedPlans = getAllowedSessionPlans(courseLevel);
                  const planIsAllowed = allowedPlans.some(
                    (size) => PLAN_LABELS[size] === createForm.packageType
                  );
                  setCreateForm({
                    ...createForm,
                    courseLevel,
                    packageType: planIsAllowed ? createForm.packageType : PLAN_LABELS[allowedPlans[0]],
                  });
                }}
                className={selectClass}
              >
                {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Link
            </button>
          </div>
        </form>
      </Modal>

      {/* Post-create: show link + quick share */}
      <Modal open={!!createdLink} onClose={() => setCreatedLink(null)} title="Payment Link Created" maxWidth="max-w-md">
        <div className="text-center py-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine)]/10 text-[var(--color-pine)] mb-4">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-[var(--color-walnut)] font-semibold mb-1">
            Link created for {createdLink?.contact?.name}
          </p>
          <p className="text-sm text-[var(--color-muted)] mb-5">
            Share this link with the parent to collect payment. Once they pay, mark it as received to continue.
          </p>
          {createdLink?.shareableUrl && (
            <div className="bg-[var(--color-ivory)] border border-[var(--color-line)] rounded-xl px-4 py-3 mb-5 text-left">
              <code className="text-xs text-[var(--color-walnut)] break-all">{createdLink.shareableUrl}</code>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setCreatedLink(null)} className={primaryButtonClass}>Done</button>
        </div>
      </Modal>

      {/* Send Modal */}
      <Modal open={!!sendTarget} onClose={() => setSendTarget(null)} title="Share Payment Link" maxWidth="max-w-sm">
        <p className="text-sm text-[var(--color-muted)] mb-5">
          Send the payment link for <strong className="text-[var(--color-walnut)]">{sendTarget && contactNameOf(sendTarget)}</strong> via:
        </p>
        {sendError && (
          <div className="mb-4 rounded-xl bg-[var(--color-ember)]/10 px-4 py-3 text-sm text-[var(--color-ember-deep)]">
            {sendError}
          </div>
        )}
        <div className="space-y-2.5">
          <button
            onClick={() => handleSend("whatsapp")}
            disabled={sending}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-line)] hover:bg-[var(--color-ivory)] transition-colors text-sm font-medium text-[var(--color-walnut)]"
          >
            <span className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 text-[var(--color-pine-deep)]" /> WhatsApp</span>
            {sendDone.includes("whatsapp") && <Check className="h-4 w-4 text-[var(--color-pine-deep)]" />}
          </button>
          <button
            onClick={() => handleSend("email")}
            disabled={sending}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-line)] hover:bg-[var(--color-ivory)] transition-colors text-sm font-medium text-[var(--color-walnut)]"
          >
            <span className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-[var(--color-ember)]" /> Email</span>
            {sendDone.includes("email") && <Check className="h-4 w-4 text-[var(--color-pine-deep)]" />}
          </button>
          <button
            onClick={() => handleSend("copy_link")}
            disabled={sending}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-line)] hover:bg-[var(--color-ivory)] transition-colors text-sm font-medium text-[var(--color-walnut)]"
          >
            <span className="flex items-center gap-2.5"><LinkIcon className="h-4 w-4 text-[var(--color-muted)]" /> Copy Link</span>
            {sendDone.includes("copy_link") && <Check className="h-4 w-4 text-[var(--color-pine-deep)]" />}
          </button>
        </div>
        <div className="flex justify-end mt-5">
          <button onClick={() => setSendTarget(null)} className={secondaryButtonClass}>Done</button>
        </div>
      </Modal>

      {/* Mark Paid Modal */}
      <Modal open={!!markPaidTarget} onClose={closeMarkPaid} title="Mark Payment as Received" maxWidth="max-w-sm">
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Confirm payment received from <strong className="text-[var(--color-walnut)]">{markPaidTarget && contactNameOf(markPaidTarget)}</strong>.
          </p>
          {markPaidError && (
            <div className="rounded-xl bg-[var(--color-ember)]/10 px-4 py-3 text-sm text-[var(--color-ember-deep)]">
              {markPaidError}
            </div>
          )}
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] px-4 py-3 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">Wise Verification</span>
            <span className="font-semibold text-[var(--color-walnut)]">Wise</span>
          </div>
          <FormField label="Wise Reference / Note" hint="Optional - Wise transfer ID, receipt reference, or payer note.">
            <input value={markPaidReference} onChange={(e) => setMarkPaidReference(e.target.value)} className={inputClass} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeMarkPaid} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={markingPaid} className={primaryButtonClass}>
              {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Confirm Received
            </button>
          </div>
        </form>
      </Modal>

      {/* Activate Modal */}
      <Modal open={!!activateTarget} onClose={closeActivateModal} title="Activate Package">
        {activationSuccess ? (
          <div className="text-center py-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine)]/10 text-[var(--color-pine)] mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-[var(--color-walnut)] font-semibold mb-1">Package activated</p>
            <p className="text-sm text-[var(--color-muted)] mb-5">
              The student&apos;s dashboard login has been created (or reactivated) and their login details were emailed to them.
            </p>
            <button onClick={closeActivateModal} className={primaryButtonClass}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            {activateError && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">{activateError}</div>}
            <p className="text-sm text-[var(--color-muted)]">
              Assign a coach and schedule to activate{" "}
              <strong className="text-[var(--color-walnut)]">
                {activateTarget ? contactNameOf(activateTarget) : "this student"}
              </strong>
              &apos;s package.
            </p>

            <FormField label="Batch" required>
              <select
                required
                value={activateForm.batch}
                onChange={(e) => {
                  const selectedBatch = batches.find((batch) => batch._id === e.target.value);
                  setActivateForm({
                    ...activateForm,
                    batch: e.target.value,
                    assignedCoach: selectedBatch ? getBatchCoachId(selectedBatch) : "",
                    schedule: selectedBatch?.schedule || "",
                  });
                }}
                className={selectClass}
              >
                <option value="">Select a matching batch...</option>
                {availableActivationBatches.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name} · {batch.courseLevel} · {getBatchCoachName(batch)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Assigned Coach" required>
              <select
                required
                disabled={Boolean(activateForm.batch)}
                value={activateForm.assignedCoach}
                onChange={(e) => setActivateForm({ ...activateForm, assignedCoach: e.target.value })}
                className={selectClass}
              >
                <option value="">Select a coach...</option>
                {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </FormField>

            <FormField label="Schedule" required>
              <input required value={activateForm.schedule} onChange={(e) => setActivateForm({ ...activateForm, schedule: e.target.value })} className={inputClass} placeholder="e.g. Sat & Sun, 10:00 AM" />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeActivateModal} className={secondaryButtonClass}>Cancel</button>
              <button type="submit" disabled={activating} className={primaryButtonClass}>
                {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Activate
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function PaymentLinksManager() {
  return (
    <Suspense>
      <PaymentLinksContent />
    </Suspense>
  );
}
