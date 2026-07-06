"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import {
  FormField,
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
} from "@/components/admin/FormField";
import {
  createPackageRecord,
  deletePackageRecord,
  getPackages,
  getStudents,
  updatePackageRecord,
  type PackagePayload,
  type Student,
  type StudentPackage,
} from "@/lib/adminApi";
import {
  COURSE_LEVELS,
  PLAN_LABELS,
  getAllowedSessionPlans,
  type CourseLevel,
} from "@/lib/courseEnrollment";
import { formatCourseLevel } from "@/lib/labels";

const PACKAGE_STATUSES: StudentPackage["status"][] = ["active", "queued", "completed", "expired", "upgraded"];

const EMPTY_FORM: PackagePayload = {
  student: "",
  packageType: "10 Sessions",
  courseLevel: "Beginner",
};

function studentName(pkg: StudentPackage) {
  return typeof pkg.student === "string" ? "Unknown student" : pkg.student.studentName;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<StudentPackage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<StudentPackage | null>(null);
  const [form, setForm] = useState<PackagePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [packageResponse, studentResponse] = await Promise.all([
        getPackages(),
        getStudents(),
      ]);
      if (!packageResponse.success) throw new Error(packageResponse.error || "Failed to load packages");
      if (!studentResponse.success) throw new Error(studentResponse.error || "Failed to load students");
      setPackages(packageResponse.data || []);
      setStudents(studentResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPackages = useMemo(() => {
    let filtered = packages;
    if (statusFilter) {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }
    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter(
      (pkg) =>
        pkg.packageType.toLowerCase().includes(query) ||
        pkg.courseLevel.toLowerCase().includes(query) ||
        studentName(pkg).toLowerCase().includes(query)
    );
  }, [packages, search, statusFilter]);

  const openCreate = () => {
    setEditingPackage(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (pkg: StudentPackage) => {
    setEditingPackage(pkg);
    setForm({
      student: typeof pkg.student === "string" ? pkg.student : pkg.student._id,
      packageType: pkg.packageType,
      courseLevel: pkg.courseLevel,
    });
    setModalOpen(true);
  };

  const handleCourseLevelChange = (courseLevel: CourseLevel) => {
    const allowedPlans = getAllowedSessionPlans(courseLevel);
    const currentPlanAllowed = allowedPlans.some(
      (size) => PLAN_LABELS[size] === form.packageType
    );
    setForm((current) => ({
      ...current,
      courseLevel,
      packageType: currentPlanAllowed ? current.packageType : PLAN_LABELS[allowedPlans[0]],
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = editingPackage
        ? await updatePackageRecord(editingPackage._id, {
            packageType: form.packageType,
            courseLevel: form.courseLevel,
          })
        : await createPackageRecord(form);
      if (!response.success) throw new Error(response.error || "Failed to save package");
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the package.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const response = await deletePackageRecord(deleteTarget._id);
      if (!response.success) throw new Error(response.error || "Failed to delete package");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the package.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Packages"
        description="Manage package history and exceptional manual package assignments"
        actions={[{ label: "Add Package", icon: Plus, onClick: openCreate }]}
      />

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search packages</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search packages..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label>
          <span className="sr-only">Filter package status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {PACKAGE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading packages" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Student", "Session Plan", "Level", "Used", "Remaining", "Status", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className={`${heading === "Actions" ? "text-right" : "text-left"} px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPackages.map((pkg) => {
                const isLocked = pkg.status === "active" || pkg.status === "queued";
                return (
                  <tr key={pkg._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{studentName(pkg)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{pkg.packageType}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{formatCourseLevel(pkg.courseLevel)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {pkg.regularClassesCompleted}/{pkg.totalClasses}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{pkg.remainingClasses}</td>
                    <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={pkg.status} /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(pkg)}
                        disabled={isLocked}
                        className="mr-3 text-blue-600 hover:text-blue-900 disabled:cursor-not-allowed disabled:text-gray-300"
                        aria-label={`Edit ${pkg.packageType} for ${studentName(pkg)}`}
                        title={isLocked ? "Active and queued packages cannot be edited" : "Edit package"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(pkg)}
                        disabled={isLocked}
                        className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:text-gray-300"
                        aria-label={`Delete ${pkg.packageType} for ${studentName(pkg)}`}
                        title={isLocked ? "Active and queued packages cannot be deleted" : "Delete package"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPackages.length === 0 && (
            <div className="py-12 text-center text-gray-500">No packages match the current filters.</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editingPackage ? "Edit Package" : "Add Package"}>
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <FormField label="Student" required>
              <select
                required
                disabled={Boolean(editingPackage)}
                value={form.student}
                onChange={(event) => setForm({ ...form, student: event.target.value })}
                className={selectClass}
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.studentName} — {student.email}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Package Type" required>
              <select
                required
                value={form.packageType}
                onChange={(event) => setForm({
                  ...form,
                  packageType: event.target.value as StudentPackage["packageType"],
                })}
                className={selectClass}
              >
                {getAllowedSessionPlans(form.courseLevel).map((size) => (
                  <option key={size} value={PLAN_LABELS[size]}>{PLAN_LABELS[size]}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Course Level" required>
              <select
                required
                value={form.courseLevel}
                onChange={(event) => handleCourseLevelChange(event.target.value as CourseLevel)}
                className={selectClass}
              >
                {COURSE_LEVELS.map((level) => <option key={level}>{level}</option>)}
              </select>
            </FormField>
            <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Session credits are fixed by the selected plan and cannot be edited manually.
            </p>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              {editingPackage ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} title="Delete Package">
        <p className="mb-6 text-gray-600">
          Delete this historical package? Packages linked to attendance, payments, or report cards are protected by the server.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className={secondaryButtonClass}>Cancel</button>
          <button type="button" onClick={handleDelete} disabled={deleting} className={dangerButtonClass}>
            {deleting && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
