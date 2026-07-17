"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Mail, Phone, Snowflake, Sun, RefreshCw } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import { primaryButtonClass, secondaryButtonClass, textareaClass } from "@/components/admin/FormField";
import { freezeStudentPortal, getStudents, unfreezeStudentPortal, type Student } from "@/lib/adminApi";
import { hasPermission } from "@/lib/auth";
import { formatCourseLevel, toTitleLabel } from "@/lib/labels";

export default function StaffStudentsPage() {
  const canFreeze = hasPermission("freeze_student_portal");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [freezeTarget, setFreezeTarget] = useState<Student | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeSaving, setFreezeSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStudents();
      if (data.success) {
        setStudents(data.data || []);
      } else {
        setError(data.error || "Failed to load students");
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

  const filteredStudents = students.filter(
    (student) =>
      student.studentName.toLowerCase().includes(search.toLowerCase()) ||
      student.parentName.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleFreeze = async () => {
    if (!freezeTarget || freezeReason.trim().length < 3) {
      setError("Please provide a short reason for pausing the portal.");
      return;
    }
    setFreezeSaving(true);
    setError("");
    try {
      const response = await freezeStudentPortal(freezeTarget._id, freezeReason.trim());
      if (!response.success) {
        setError(response.error || "Could not pause the student portal.");
        return;
      }
      setFreezeTarget(null);
      setFreezeReason("");
      await load();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setFreezeSaving(false);
    }
  };

  const handleUnfreeze = async (student: Student) => {
    setFreezeSaving(true);
    setError("");
    try {
      const response = await unfreezeStudentPortal(student._id);
      if (!response.success) {
        setError(response.error || "Could not resume the student portal.");
        return;
      }
      await load();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setFreezeSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Students" description="View and manage enrolled students" />
        <div className="flex justify-center py-12" role="status" aria-label="Loading students">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="View and manage enrolled students"
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
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-control admin-control-search"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{filteredStudents.length} shown</span>
          <button type="button" onClick={() => void load()} disabled={loading || freezeSaving} className={secondaryButtonClass}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table min-w-[820px]">
          <thead>
            <tr>
              <th className="text-left">Student</th>
              <th className="text-left">Parent</th>
              <th className="text-left">Contact</th>
              <th className="text-left">Level</th>
              <th className="text-left">Status</th>
              {canFreeze && <th className="text-right">Portal</th>}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student._id}>
                <td className="whitespace-nowrap admin-primary-cell">{student.studentName}</td>
                <td className="whitespace-nowrap">{student.parentName}</td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    {student.email}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    {student.phoneNumber || "—"}
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  {student.courseLevel ? formatCourseLevel(student.courseLevel) : toTitleLabel(student.course)}
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={student.status || student.studentStatus || student.enrollmentStatus} />
                    {student.portalStatus && student.portalStatus !== "active" && <StatusBadge status={student.portalStatus} />}
                  </div>
                </td>
                {canFreeze && (
                  <td className="whitespace-nowrap text-right">
                    {student.portalStatus === "frozen" ? (
                      <button
                        type="button"
                        onClick={() => handleUnfreeze(student)}
                        disabled={freezeSaving}
                        className={secondaryButtonClass}
                      >
                        <Sun className="h-4 w-4" /> Resume
                      </button>
                    ) : student.portalStatus !== "expired" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFreezeTarget(student);
                          setFreezeReason("");
                        }}
                        className={secondaryButtonClass}
                      >
                        <Snowflake className="h-4 w-4" /> Pause
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">Renewal required</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div className="admin-empty">{search.trim() ? `No students match “${search.trim()}”.` : "No students found"}</div>
        )}
      </div>

      <Modal open={Boolean(freezeTarget)} onClose={() => !freezeSaving && setFreezeTarget(null)} title="Pause Student Portal" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Pause new classes and package countdown for <strong>{freezeTarget?.studentName}</strong>.
          </p>
          <label className="block text-sm font-medium text-[var(--color-walnut)]">
            Reason
            <textarea
              value={freezeReason}
              onChange={(event) => setFreezeReason(event.target.value)}
              rows={3}
              maxLength={500}
              className={`${textareaClass} mt-1.5`}
              placeholder="For example: exam leave"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setFreezeTarget(null)} disabled={freezeSaving} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="button" onClick={handleFreeze} disabled={freezeSaving} className={primaryButtonClass}>
              {freezeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Snowflake className="h-4 w-4" />}
              Pause Portal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
