"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, Mail, Phone, Package as PackageIcon, ExternalLink } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import { FormField, inputClass, selectClass, textareaClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "@/components/admin/FormField";
import { getStudents, createStudent, updateStudent, deleteStudent, type Student } from "@/lib/adminApi";
import { COUNTRY_OPTIONS, formatPhoneInput } from "@/lib/phone";
import Link from "next/link";

const STUDENT_STATUSES = ["active", "inactive", "graduated", "suspended"];
const ENROLLMENT_STATUSES = ["enrolled", "pending", "completed", "expired", "dropped"];

type StudentFormState = {
  studentName: string;
  parentName: string;
  phoneNumber: string;
  country: "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM";
  email: string;
  course: string;
  enrollmentStatus: string;
  studentStatus: string;
  notes: string;
};

const EMPTY_FORM: StudentFormState = {
  studentName: "",
  parentName: "",
  phoneNumber: "",
  country: "US",
  email: "",
  course: "",
  enrollmentStatus: "pending",
  studentStatus: "active",
  notes: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getStudents();
      if (res.success) setStudents(res.data);
      else setError(res.error || "Failed to load students");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesStatus = !statusFilter || s.studentStatus === statusFilter;
      const matchesSearch =
        !search ||
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.parentName.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [students, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingId(student._id);
    setForm({
      studentName: student.studentName,
      parentName: student.parentName,
      phoneNumber: student.phoneNumber,
      country: (student.country as "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM") || "US",
      email: student.email,
      course: student.course,
      enrollmentStatus: student.enrollmentStatus,
      studentStatus: student.studentStatus,
      notes: student.notes || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const res = editingId ? await updateStudent(editingId, form) : await createStudent(form);
      if (res.success) {
        setModalOpen(false);
        loadStudents();
      } else {
        setFormError(res.error || "Failed to save student");
      }
    } catch {
      setFormError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteStudent(deleteTarget._id);
      if (res.success) {
        setStudents((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      } else {
        setError(res.error || "Failed to delete student.");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Students"
        description="Enrolled students and their packages. New students get a dashboard login once their package is activated."
        actions={
          <button onClick={openCreate} className={primaryButtonClass}>
            <Plus className="h-4 w-4" /> Add Student
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className={inputClass + " pl-10"}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass + " w-auto"}>
          <option value="">All statuses</option>
          {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-[var(--color-ember)] animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="text-center py-16 text-sm text-[var(--color-muted)]">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Package</th>
                  <th className="px-5 py-3">Access</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-[var(--color-ivory)]/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--color-walnut)]">{student.studentName}</p>
                      <p className="text-xs text-[var(--color-muted)]">Parent: {student.parentName}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]"><Mail className="h-3 w-3" /> {student.email}</p>
                      <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] mt-0.5">
                        <Phone className="h-3 w-3" /> {COUNTRY_OPTIONS.find((c) => c.code === student.country)?.dialCode || "+1"} {formatPhoneInput(student.phoneNumber, student.country)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">{student.course}</td>
                    <td className="px-5 py-3.5">
                      {student.currentPackageId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-pine-deep)]">
                          <PackageIcon className="h-3.5 w-3.5" />
                          {typeof student.currentPackageId === "object"
                            ? `${student.currentPackageId.packageType} · ${student.currentPackageId.status}`
                            : "Package assigned"}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">No active package</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {typeof student.currentPackageId === "object" ? (
                        <div className="text-xs">
                          <p className="font-medium text-[var(--color-walnut)]">
                            {student.currentPackageId.remainingClasses} session{student.currentPackageId.remainingClasses === 1 ? "" : "s"} left
                          </p>
                          <p className="mt-0.5 text-[var(--color-muted)]">
                            {student.portalStatus === "expired" ? "Renewal required" : "Plan controlled"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">
                          {student.portalStatus === "expired" ? "Renewal required" : "No active plan"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={student.studentStatus} />
                        {student.portalStatus && student.portalStatus !== "active" && (
                          <StatusBadge status={student.portalStatus} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/admin/students/${student._id}`} className="text-[var(--color-muted)] hover:text-[var(--color-pine-deep)] p-1.5 inline-flex" aria-label="View Profile">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button onClick={() => openEdit(student)} className="text-[var(--color-muted)] hover:text-[var(--color-walnut)] p-1.5" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(student)} className="text-[var(--color-muted)] hover:text-[var(--color-ember-deep)] p-1.5" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Student" : "Add Student"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">{formError}</div>}
          {!editingId && (
            <div className="bg-[var(--color-gold)]/10 text-[#8a6418] px-4 py-3 rounded-xl text-sm">
              This creates the student profile. Portal login is created when package payment is activated, or manually from the student profile.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Student Name" required>
              <input required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Parent Name" required>
              <input required value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className={inputClass} />
            </FormField>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Email" required>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Phone" required>
              <div className="flex gap-2">
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value as "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM" })} className={selectClass + " w-[90px] shrink-0"}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.dialCode}</option>
                  ))}
                </select>
                <input
                  required
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: formatPhoneInput(e.target.value, form.country) })}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>
            </FormField>
          </div>

          <FormField label="Course" required>
            <input required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className={inputClass} placeholder="e.g. Beginner Chess" />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Enrollment Status">
              <select value={form.enrollmentStatus} onChange={(e) => setForm({ ...form, enrollmentStatus: e.target.value })} className={selectClass}>
                {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Student Status">
              <select value={form.studentStatus} onChange={(e) => setForm({ ...form, studentStatus: e.target.value })} className={selectClass}>
                {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={textareaClass} rows={3} />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save Changes" : "Add Student"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Student" maxWidth="max-w-sm">
        <p className="text-sm text-[var(--color-walnut)] mb-5">
          Are you sure you want to delete <strong>{deleteTarget?.studentName}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleDelete} className={dangerButtonClass}>Delete</button>
        </div>
      </Modal>

    </div>
  );
}
