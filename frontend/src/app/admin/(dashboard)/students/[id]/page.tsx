"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
 

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, User, CreditCard, BookOpen, Calendar, Bell, FileText, Clock, BookCheck, Key, CheckCircle2, Snowflake, Sun } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import {
  secondaryButtonClass,
  primaryButtonClass,
  FormField,
  inputClass,
} from "@/components/admin/FormField";
import {
  getStudent,
  getPaymentLinks,
  getPayments,
  getClasses,
  getStudentEvaluationReports,
  getNotifications,
  getAuditLogsByEntity,
  provisionStudentAccess,
  freezeStudentPortal,
  unfreezeStudentPortal,
  type Student,
} from "@/lib/adminApi";
import { COUNTRY_OPTIONS, formatPhoneInput } from "@/lib/phone";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";

type Tab = "personal" | "course" | "payments" | "attendance" | "classes" | "notifications" | "reports" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "course", label: "Course / Package", icon: BookOpen },
  { id: "payments", label: "Payment History", icon: CreditCard },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "classes", label: "Classes", icon: BookCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "reports", label: "Report Cards", icon: FileText },
  { id: "timeline", label: "Activity Timeline", icon: Clock },
];

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());

  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionPassword, setProvisionPassword] = useState("");
  const [provisionConfirm, setProvisionConfirm] = useState("");
  const [provisionError, setProvisionError] = useState("");
  const [provisionSaving, setProvisionSaving] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState("");

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeError, setFreezeError] = useState("");
  const [freezeSaving, setFreezeSaving] = useState(false);
  const [freezeSuccess, setFreezeSuccess] = useState("");

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const res = await getStudent(id);
        if (res.success) setStudent(res.data);
        else setError(res.error || "Failed to load student");
      } catch {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadStudent();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (!["payments", "classes", "reports", "notifications", "timeline"].includes(activeTab)) {
      return;
    }
    // Skip if tab data is already loaded
    if (loadedTabs.has(activeTab)) return;

    const loadTab = async () => {
      setTabLoading(true);
      setTabError("");
      try {
        let loadedSuccessfully = false;
        if (activeTab === "payments") {
          const [linksRes, paymentsRes] = await Promise.all([
            getPaymentLinks({ student: id }),
            getPayments({ student: id }),
          ]);
          if (linksRes.success) setPaymentLinks(linksRes.data);
          if (paymentsRes.success) setPayments(paymentsRes.data);
          loadedSuccessfully = linksRes.success && paymentsRes.success;
          if (!loadedSuccessfully) {
            setTabError(
              linksRes.error ||
                paymentsRes.error ||
                "Payment history could not be loaded."
            );
          }
        } else if (activeTab === "classes") {
          const res = await getClasses({ student: id });
          if (res.success) {
            setClasses(res.data);
            loadedSuccessfully = true;
          } else setTabError(res.error || "Classes could not be loaded.");
        } else if (activeTab === "reports") {
          const res = await getStudentEvaluationReports(id);
          if (res.success) {
            setReports(res.data);
            loadedSuccessfully = true;
          } else setTabError(res.error || "Report cards could not be loaded.");
        } else if (activeTab === "notifications") {
          const res = await getNotifications({ student: id });
          if (res.success) {
            setNotifications(res.data);
            loadedSuccessfully = true;
          } else setTabError(res.error || "Notifications could not be loaded.");
        } else if (activeTab === "timeline") {
          const res = await getAuditLogsByEntity(id);
          if (res.success) {
            setTimeline(res.data);
            loadedSuccessfully = true;
          } else setTabError(res.error || "Activity timeline could not be loaded.");
        }
        if (loadedSuccessfully) {
          setLoadedTabs((previous) => new Set(previous).add(activeTab));
        }
      } catch {
        setTabError("Could not connect to the server.");
      } finally {
        setTabLoading(false);
      }
    };
    loadTab();
  }, [activeTab, id, loadedTabs]);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError("");
    if (provisionPassword !== provisionConfirm) {
      setProvisionError("Passwords do not match.");
      return;
    }
    if (provisionPassword.length < 8) {
      setProvisionError("Password must be at least 8 characters.");
      return;
    }
    setProvisionSaving(true);
    try {
      const res = await provisionStudentAccess(id, provisionPassword);
      if (res.success) {
        setProvisionOpen(false);
        setProvisionPassword("");
        setProvisionConfirm("");
        setProvisionSuccess(
          res.data?.isNew
            ? "Portal access created. Share the credentials with the parent securely."
            : "Portal credentials updated. Existing student sessions were signed out."
        );
        setTimeout(() => setProvisionSuccess(""), 4000);
      } else {
        setProvisionError(res.error || "Failed to provision access.");
      }
    } catch {
      setProvisionError("Could not connect to the server.");
    } finally {
      setProvisionSaving(false);
    }
  };

  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setFreezeError("");
    if (!freezeReason.trim()) {
      setFreezeError("Please give a reason (e.g. exam leave).");
      return;
    }
    setFreezeSaving(true);
    try {
      const res = await freezeStudentPortal(id, freezeReason.trim());
      if (res.success) {
        setFreezeOpen(false);
        setFreezeReason("");
        setStudent(res.data ?? null);
        setFreezeSuccess("Portal paused. Classes and package countdown are on hold.");
        setTimeout(() => setFreezeSuccess(""), 4000);
      } else {
        setFreezeError(res.error || "Failed to pause the portal.");
      }
    } catch {
      setFreezeError("Could not connect to the server.");
    } finally {
      setFreezeSaving(false);
    }
  };

  const handleUnfreeze = async () => {
    setFreezeSaving(true);
    setFreezeError("");
    try {
      const res = await unfreezeStudentPortal(id);
      if (res.success) {
        setStudent(res.data ?? null);
        setFreezeSuccess("Portal resumed. Classes and package countdown are active again.");
        setTimeout(() => setFreezeSuccess(""), 4000);
      } else {
        setFreezeError(res.error || "Failed to resume the portal.");
      }
    } catch {
      setFreezeError("Could not connect to the server.");
    } finally {
      setFreezeSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-[var(--color-ember)] animate-spin" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div>
        <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm mb-4">{error || "Student not found."}</div>
        <Link href="/admin/students" className={secondaryButtonClass}>← Back</Link>
      </div>
    );
  }

  const dialCode = COUNTRY_OPTIONS.find((c) => c.code === student.country)?.dialCode || "+1";
  const pkg = (student as any).currentPackageId;

  return (
    <div>
      <PageHeader
        title={student.studentName}
        description={`Student profile — ${student.email}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { setProvisionOpen(true); setProvisionError(""); setProvisionPassword(""); setProvisionConfirm(""); }} className={secondaryButtonClass}>
              <Key className="h-4 w-4" /> Portal Access
            </button>
            {student.portalStatus === "frozen" ? (
              <button onClick={handleUnfreeze} disabled={freezeSaving} className={secondaryButtonClass}>
                <Sun className="h-4 w-4" /> {freezeSaving ? "Resuming…" : "Resume Classes"}
              </button>
            ) : student.portalStatus !== "expired" ? (
              <button onClick={() => { setFreezeOpen(true); setFreezeError(""); setFreezeReason(""); }} className={secondaryButtonClass}>
                <Snowflake className="h-4 w-4" /> Pause Classes
              </button>
            ) : null}
            <button onClick={() => router.back()} className={secondaryButtonClass}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="flex flex-wrap gap-2 mb-6">
        {provisionSuccess && (
          <div className="w-full flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {provisionSuccess}
          </div>
        )}
        {freezeSuccess && (
          <div className="w-full flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {freezeSuccess}
          </div>
        )}
        {student.portalStatus === "frozen" && (
          <div className="w-full flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-xl text-sm">
            <Snowflake className="h-4 w-4 shrink-0" />
            Classes paused{student.frozenReason ? `: ${student.frozenReason}` : ""}
            {student.frozenAt ? ` · since ${new Date(student.frozenAt).toLocaleDateString()}` : ""}
          </div>
        )}
        {student.portalStatus === "expired" && (
          <div className="w-full flex items-center gap-2 bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-2.5 rounded-xl text-sm">
            Portal access expired. Renew the package to restore access.
          </div>
        )}
        <StatusBadge status={student.studentStatus} />
        <StatusBadge status={student.enrollmentStatus} />
        {student.course && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-walnut)]/10 text-[var(--color-walnut)]">
            {student.course}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto border-b border-[var(--color-line)] mb-6">
        <div className="flex gap-0 min-w-max">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tabId
                  ? "border-[var(--color-ember)] text-[var(--color-ember)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-walnut)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)] p-6">
        {tabLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-[var(--color-ember)] animate-spin" />
          </div>
        )}

        {!tabLoading && tabError && (
          <div className="rounded-xl border border-[var(--color-ember)]/20 bg-[var(--color-ember)]/10 px-4 py-3 text-sm text-[var(--color-ember-deep)]">
            {tabError}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "personal" && (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {[
              { label: "Student Name", value: student.studentName },
              { label: "Parent Name", value: student.parentName },
              { label: "Email", value: student.email },
              { label: "Phone", value: `${dialCode} ${formatPhoneInput(student.phoneNumber, (student.country as any) || "US")}` },
              { label: "Country", value: COUNTRY_OPTIONS.find((c) => c.code === student.country)?.label || student.country || "—" },
              { label: "Course", value: student.course },
              { label: "Enrolled", value: student.enrollmentStatus },
              { label: "Status", value: student.studentStatus },
              { label: "Notes", value: (student as any).notes || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">{label}</p>
                <p className="text-sm text-[var(--color-walnut)]">{value || "—"}</p>
              </div>
            ))}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "course" && (
          <div>
            {pkg && typeof pkg === "object" ? (
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                {[
                  { label: "Package Type", value: pkg.packageType },
                  { label: "Course Level", value: pkg.courseLevel },
                  { label: "Status", value: pkg.status },
                  { label: "Purchased Sessions", value: String(pkg.totalClasses ?? "—") },
                  { label: "Sessions Used", value: String(pkg.completedClasses ?? "—") },
                  { label: "Sessions Remaining", value: String(pkg.remainingClasses ?? "—") },
                  { label: "Enrollment Date", value: pkg.enrollmentDate ? new Date(pkg.enrollmentDate).toLocaleDateString() : "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">{label}</p>
                    <p className="text-sm text-[var(--color-walnut)]">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No active package assigned.</p>
            )}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "payments" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--color-walnut)] mb-3">Payment Links</h3>
              {paymentLinks.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No payment links found.</p>
              ) : (
                <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] rounded-xl overflow-hidden">
                  {paymentLinks.map((l) => (
                    <div key={l._id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                      <span className="text-[var(--color-walnut)]">{l.packageType} — {formatCurrency(l.amount, l.currency)}</span>
                      <StatusBadge status={l.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-walnut)] mb-3">Payments</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No payments recorded.</p>
              ) : (
                <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] rounded-xl overflow-hidden">
                  {payments.map((p) => (
                    <div key={p._id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                      <span className="text-[var(--color-walnut)]">{formatCurrency(p.amount, p.currency)} — {p.paymentMethod || "—"}</span>
                      <span className="text-xs text-[var(--color-muted)]">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "attendance" && (
          <div className="grid sm:grid-cols-2 gap-6">
            {pkg && typeof pkg === "object" ? (
              <>
                <div className="bg-[var(--color-ivory)] rounded-xl p-5 text-center">
                  <p className="text-3xl font-bold text-[var(--color-walnut)]">{pkg.regularClassesCompleted ?? 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mt-1">Sessions Used</p>
                </div>
                <div className="bg-[var(--color-ivory)] rounded-xl p-5 text-center">
                  <p className="text-3xl font-bold text-[var(--color-walnut)]">{pkg.completedClasses ?? 0} / {pkg.totalClasses ?? 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mt-1">Plan Progress</p>
                </div>
                <div className="bg-[var(--color-ivory)] rounded-xl p-5 text-center">
                  <p className="text-3xl font-bold text-[var(--color-walnut)]">{pkg.remainingClasses ?? 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mt-1">Sessions Remaining</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted)] col-span-2">No active package — attendance data unavailable.</p>
            )}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "classes" && (
          <div>
            {classes.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No classes scheduled.</p>
            ) : (
              <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] rounded-xl overflow-hidden">
                {classes.map((cls) => (
                  <div key={cls._id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-[var(--color-walnut)]">{new Date(cls.date).toLocaleDateString()} · {cls.startTime}</p>
                      <p className="text-xs text-[var(--color-muted)]">{cls.course} — {cls.classType}</p>
                    </div>
                    <StatusBadge status={cls.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "notifications" && (
          <div>
            {notifications.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No notifications found.</p>
            ) : (
              <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] rounded-xl overflow-hidden">
                {notifications.map((n) => (
                  <div key={n._id} className="px-4 py-3 text-sm">
                    <p className="font-medium text-[var(--color-walnut)]">{n.type?.replace(/_/g, " ") || "Notification"}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "reports" && (
          <div>
            {reports.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No report cards found.</p>
            ) : (
              <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] rounded-xl overflow-hidden">
                {reports.map((r) => (
                  <div key={r._id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-[var(--color-walnut)]">{r.title || "Report Card"}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {new Date(r.createdAt).toLocaleDateString()} · {r.recommendedNextLevel}
                      </p>
                    </div>
                    <StatusBadge status={r.isPublished ? "completed" : "pending"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!tabLoading && !tabError && activeTab === "timeline" && (
          <div>
            {timeline.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((entry) => (
                  <div key={entry._id} className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember)] mt-2 shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-walnut)]">
                        <span className="font-medium capitalize">{entry.action?.replace(/_/g, " ")}</span>
                        {entry.entityName ? ` — ${entry.entityName}` : ""}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {entry.userEmail} · {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portal Access Modal */}
      <Modal open={provisionOpen} onClose={() => setProvisionOpen(false)} title="Create / Update Portal Access" maxWidth="max-w-sm">
        <form onSubmit={handleProvision} className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Set a password for <strong>{student?.studentName}</strong> to access the Student Portal at{" "}
            <code className="text-xs bg-[var(--color-ivory)] px-1.5 py-0.5 rounded">/student/login</code>.
          </p>
          {provisionError && (
            <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">{provisionError}</div>
          )}
          <FormField label="Password" required>
            <input
              type="password"
              required
              minLength={8}
              value={provisionPassword}
              onChange={(e) => setProvisionPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </FormField>
          <FormField label="Confirm Password" required>
            <input
              type="password"
              required
              value={provisionConfirm}
              onChange={(e) => setProvisionConfirm(e.target.value)}
              className={inputClass}
              placeholder="Repeat password"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setProvisionOpen(false)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={provisionSaving} className={primaryButtonClass}>
              {provisionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Set Credentials
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={freezeOpen} onClose={() => setFreezeOpen(false)} title="Pause Classes" maxWidth="max-w-sm">
        <form onSubmit={handleFreeze} className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Package countdown will pause and {student.studentName} will be excluded from new batch classes until resumed. Nothing is lost — they can resume anytime.
          </p>
          {freezeError && (
            <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-3 py-2 rounded-lg text-sm">{freezeError}</div>
          )}
          <FormField label="Reason" required>
            <textarea
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              className={inputClass}
              rows={3}
              maxLength={500}
              placeholder="e.g. Exam leave until 15th July"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFreezeOpen(false)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={freezeSaving} className={primaryButtonClass}>
              {freezeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Snowflake className="h-4 w-4" />}
              Pause Classes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
