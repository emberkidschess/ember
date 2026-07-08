"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Loader2, Pencil, Plus, Search, Send } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Modal from "@/components/admin/Modal";
import {
  FormField,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
  textareaClass,
} from "@/components/admin/FormField";
import {
  createEvaluationReport,
  getEvaluationReports,
  getPackages,
  getStaffList,
  publishEvaluationReport,
  updateEvaluationReport,
  type EvaluationReport,
  type EvaluationReportPayload,
  type StaffMember,
  type StudentPackage,
} from "@/lib/adminApi";
import { hasPermission } from "@/lib/auth";
import { formatCourseLevel } from "@/lib/labels";

type ReportForm = Omit<EvaluationReportPayload, "strengths" | "weaknesses"> & {
  strengths: string;
  weaknesses: string;
};

const EMPTY_FORM: ReportForm = {
  student: "",
  package: "",
  coach: "",
  title: "Package Completion Report",
  strengths: "",
  weaknesses: "",
  tacticalSkills: 5,
  openingKnowledge: 5,
  endgameUnderstanding: 5,
  coachNotes: "",
  recommendedNextLevel: "Renew",
};

function entityName(entity: EvaluationReport["student"] | EvaluationReport["coach"]) {
  if (typeof entity === "string") return "Unknown";
  return "studentName" in entity ? entity.studentName : entity.name;
}

function packageLabel(pkg: EvaluationReport["package"]) {
  return typeof pkg === "string" ? "Package" : `${pkg.packageType} · ${formatCourseLevel(pkg.courseLevel)}`;
}

function splitList(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadReport(report: EvaluationReport) {
  const list = (values: string[]) => values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 24px;color:#2f211b}h1{margin-bottom:4px}.muted{color:#6f625c}.scores{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.score{padding:16px;border:1px solid #ddd;border-radius:12px}.score b{font-size:24px;display:block}section{margin-top:24px}li{margin:6px 0}@media print{body{margin:20px auto}}</style>
  </head><body><p class="muted">EmberKids Chess Academy</p><h1>${escapeHtml(report.title)}</h1>
  <p class="muted">${escapeHtml(entityName(report.student))} · ${escapeHtml(packageLabel(report.package))}</p>
  <div class="scores"><div class="score"><b>${report.tacticalSkills}/10</b>Tactical skills</div><div class="score"><b>${report.openingKnowledge}/10</b>Opening knowledge</div><div class="score"><b>${report.endgameUnderstanding}/10</b>Endgame</div></div>
  <section><h2>Strengths</h2><ul>${list(report.strengths)}</ul></section>
  <section><h2>Areas to improve</h2><ul>${list(report.weaknesses)}</ul></section>
  <section><h2>Coach notes</h2><p>${escapeHtml(report.coachNotes)}</p></section>
  <section><h2>Recommendation</h2><p>${escapeHtml(report.recommendedNextLevel)}</p></section>
  <p class="muted">Coach: ${escapeHtml(entityName(report.coach))} · ${new Date(report.createdAt).toLocaleDateString()}</p></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${entityName(report.student).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report-card.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function StaffReportCardsPage() {
  const canCreate = hasPermission("create_report_card");
  const canExport = hasPermission("export_report_card");
  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [packages, setPackages] = useState<StudentPackage[]>([]);
  const [coaches, setCoaches] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [viewReport, setViewReport] = useState<EvaluationReport | null>(null);
  const [editingReport, setEditingReport] = useState<EvaluationReport | null>(null);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reportResponse, packageResponse, coachResponse] = await Promise.all([
        getEvaluationReports(),
        getPackages({ status: "completed" }),
        getStaffList("coach"),
      ]);
      if (!reportResponse.success) throw new Error(reportResponse.error || "Failed to load reports");
      if (!packageResponse.success) throw new Error(packageResponse.error || "Failed to load eligible packages");
      if (!coachResponse.success) throw new Error(coachResponse.error || "Failed to load coaches");
      setReports(reportResponse.data || []);
      setPackages(packageResponse.data || []);
      setCoaches((coachResponse.data || []).filter((coach) => coach.status === "active"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reports;
    return reports.filter((report) =>
      [entityName(report.student), entityName(report.coach), report.title, packageLabel(report.package)]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [reports, search]);

  const usedPackageIds = useMemo(
    () => new Set(reports.map((report) => typeof report.package === "string" ? report.package : report.package._id)),
    [reports]
  );
  const eligiblePackages = packages.filter((pkg) => !usedPackageIds.has(pkg._id) || pkg._id === form.package);

  const openCreate = () => {
    setEditingReport(null);
    setForm({ ...EMPTY_FORM, coach: coaches.length === 1 ? coaches[0]._id : "" });
    setFormOpen(true);
  };

  const openEdit = (report: EvaluationReport) => {
    setEditingReport(report);
    setForm({
      student: typeof report.student === "string" ? report.student : report.student._id,
      package: typeof report.package === "string" ? report.package : report.package._id,
      coach: typeof report.coach === "string" ? report.coach : report.coach._id,
      title: report.title,
      strengths: report.strengths.join("\n"),
      weaknesses: report.weaknesses.join("\n"),
      tacticalSkills: report.tacticalSkills,
      openingKnowledge: report.openingKnowledge,
      endgameUnderstanding: report.endgameUnderstanding,
      coachNotes: report.coachNotes,
      recommendedNextLevel: report.recommendedNextLevel as ReportForm["recommendedNextLevel"],
    });
    setFormOpen(true);
  };

  const selectPackage = (packageId: string) => {
    const selected = packages.find((pkg) => pkg._id === packageId);
    const studentId = selected
      ? typeof selected.student === "string" ? selected.student : selected.student._id
      : "";
    setForm((current) => ({ ...current, package: packageId, student: studentId }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload: EvaluationReportPayload = {
      ...form,
      strengths: splitList(form.strengths),
      weaknesses: splitList(form.weaknesses),
    };
    try {
      const response = editingReport
        ? await updateEvaluationReport(editingReport._id, {
            title: payload.title,
            strengths: payload.strengths,
            weaknesses: payload.weaknesses,
            tacticalSkills: payload.tacticalSkills,
            openingKnowledge: payload.openingKnowledge,
            endgameUnderstanding: payload.endgameUnderstanding,
            coachNotes: payload.coachNotes,
            recommendedNextLevel: payload.recommendedNextLevel,
          })
        : await createEvaluationReport(payload);
      if (!response.success) throw new Error(response.error || "Failed to save report card");
      setFormOpen(false);
      setMessage(editingReport ? "Draft report updated." : "Draft report created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the report card.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (report: EvaluationReport) => {
    if (!window.confirm(`Publish ${report.title} for ${entityName(report.student)}? Published reports cannot be edited.`)) return;
    setPublishingId(report._id);
    setError("");
    try {
      const response = await publishEvaluationReport(report._id);
      if (!response.success) throw new Error(response.error || "Failed to publish report");
      setMessage("Report published and the parent notification was queued.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish the report.");
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Report Cards"
        description="Create completion reports, review drafts, publish to student portals, and export copies"
        actions={canCreate ? [{ label: "Create Report Card", icon: Plus, onClick: openCreate }] : undefined}
      />

      {error && <div role="alert" className="admin-alert admin-alert-error">{error}</div>}
      {message && <div role="status" className="admin-alert admin-alert-success">{message}</div>}

      <div className="admin-toolbar">
        <label className="relative block flex-1">
          <span className="sr-only">Search report cards</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="search"
            placeholder="Search report cards..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="admin-control admin-control-search"
          />
        </label>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table min-w-full">
          <thead>
            <tr>
              {["Student", "Package", "Coach", "Created", "Status", "Actions"].map((heading) => (
                <th key={heading} className={heading === "Actions" ? "text-right" : "text-left"}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report._id}>
                <td className="whitespace-nowrap admin-primary-cell">{entityName(report.student)}</td>
                <td className="whitespace-nowrap">{packageLabel(report.package)}</td>
                <td className="whitespace-nowrap">{entityName(report.coach)}</td>
                <td className="whitespace-nowrap">{new Date(report.createdAt).toLocaleDateString()}</td>
                <td className="whitespace-nowrap">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${report.isPublished ? "border-[rgba(63,107,92,0.22)] bg-[var(--color-pine)]/10 text-[var(--color-pine-deep)]" : "border-[rgba(224,163,61,0.32)] bg-[var(--color-gold)]/15 text-[#8a6418]"}`}>
                    {report.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right">
                  <button type="button" onClick={() => setViewReport(report)} className="admin-icon-button mr-2" aria-label="View report"><Eye className="h-4 w-4" /></button>
                  {!report.isPublished && canCreate && (
                    <>
                      <button type="button" onClick={() => openEdit(report)} className="admin-icon-button mr-2" aria-label="Edit draft"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handlePublish(report)} disabled={publishingId === report._id} className="admin-icon-button mr-2" aria-label="Publish report">
                        {publishingId === report._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                  {canExport && (
                    <button type="button" onClick={() => downloadReport(report)} className="admin-icon-button" aria-label="Download report"><Download className="h-4 w-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredReports.length === 0 && (
          <div className="admin-empty">
            <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--color-muted)]" />
            No report cards found. Completed packages without an existing report are eligible.
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={editingReport ? "Edit Draft Report" : "Create Report Card"} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Completed Package" required hint={eligiblePackages.length ? undefined : "No completed package is currently eligible for a new report."}>
            <select required disabled={Boolean(editingReport)} value={form.package} onChange={(event) => selectPackage(event.target.value)} className={selectClass}>
              <option value="">Select a completed package</option>
              {eligiblePackages.map((pkg) => (
                <option key={pkg._id} value={pkg._id}>{typeof pkg.student === "string" ? "Student" : pkg.student.studentName} — {pkg.packageType} ({formatCourseLevel(pkg.courseLevel)})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Coach" required>
            <select required disabled={Boolean(editingReport)} value={form.coach} onChange={(event) => setForm({ ...form, coach: event.target.value })} className={selectClass}>
              <option value="">Select a coach</option>
              {coaches.map((coach) => <option key={coach._id} value={coach._id}>{coach.name}</option>)}
            </select>
          </FormField>
          <FormField label="Title" required><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} maxLength={200} /></FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ["tacticalSkills", "Tactical Skills"],
              ["openingKnowledge", "Opening Knowledge"],
              ["endgameUnderstanding", "Endgame"],
            ] as const).map(([key, label]) => (
              <FormField key={key} label={`${label} / 10`} required>
                <input required type="number" min={1} max={10} value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} className={inputClass} />
              </FormField>
            ))}
          </div>
          <FormField label="Strengths" hint="One item per line or comma-separated"><textarea value={form.strengths} onChange={(event) => setForm({ ...form, strengths: event.target.value })} className={textareaClass} rows={3} /></FormField>
          <FormField label="Areas to Improve" hint="One item per line or comma-separated"><textarea value={form.weaknesses} onChange={(event) => setForm({ ...form, weaknesses: event.target.value })} className={textareaClass} rows={3} /></FormField>
          <FormField label="Coach Notes"><textarea value={form.coachNotes} onChange={(event) => setForm({ ...form, coachNotes: event.target.value })} className={textareaClass} rows={4} maxLength={5000} /></FormField>
          <FormField label="Recommendation" required>
            <select required value={form.recommendedNextLevel} onChange={(event) => setForm({ ...form, recommendedNextLevel: event.target.value as ReportForm["recommendedNextLevel"] })} className={selectClass}>
              {["Renew", "Beginner", "Intermediate", "Advanced", "Expert"].map((level) => <option key={level}>{level}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} disabled={saving} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={saving || (!editingReport && eligiblePackages.length === 0)} className={primaryButtonClass}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save Draft
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(viewReport)} onClose={() => setViewReport(null)} title={viewReport?.title || "Report Card"} maxWidth="max-w-2xl">
        {viewReport && (
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-lg font-bold text-[var(--color-walnut)]">{entityName(viewReport.student)}</p>
              <p className="text-[var(--color-muted)]">{packageLabel(viewReport.package)} · Coach {entityName(viewReport.coach)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[["Tactical", viewReport.tacticalSkills], ["Opening", viewReport.openingKnowledge], ["Endgame", viewReport.endgameUnderstanding]].map(([label, score]) => (
                <div key={label} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-ivory)] p-4"><p className="text-[var(--color-muted)]">{label}</p><p className="text-2xl font-bold text-[var(--color-walnut)]">{score}/10</p></div>
              ))}
            </div>
            <div><h3 className="font-bold text-[var(--color-walnut)]">Strengths</h3><p className="mt-1 text-[var(--color-muted)]">{viewReport.strengths.join(", ") || "None recorded"}</p></div>
            <div><h3 className="font-bold text-[var(--color-walnut)]">Areas to improve</h3><p className="mt-1 text-[var(--color-muted)]">{viewReport.weaknesses.join(", ") || "None recorded"}</p></div>
            <div><h3 className="font-bold text-[var(--color-walnut)]">Coach notes</h3><p className="mt-1 whitespace-pre-wrap text-[var(--color-muted)]">{viewReport.coachNotes || "No notes"}</p></div>
            <div><h3 className="font-bold text-[var(--color-walnut)]">Recommendation</h3><p className="mt-1 text-[var(--color-muted)]">{viewReport.recommendedNextLevel}</p></div>
            {canExport && (
              <div className="flex justify-end"><button type="button" onClick={() => downloadReport(viewReport)} className={primaryButtonClass}><Download className="h-4 w-4" />Download</button></div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
