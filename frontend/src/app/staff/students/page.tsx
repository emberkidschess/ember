"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Mail, Phone, Snowflake, Sun } from "lucide-react";
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
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Students"
        description="View and manage enrolled students"
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-[820px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {canFreeze && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Portal</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{student.studentName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.parentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    {student.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Phone className="h-4 w-4" />
                    {student.phoneNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {student.courseLevel ? formatCourseLevel(student.courseLevel) : toTitleLabel(student.course)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={student.status || student.studentStatus || student.enrollmentStatus} />
                    {student.portalStatus && student.portalStatus !== "active" && <StatusBadge status={student.portalStatus} />}
                  </div>
                </td>
                {canFreeze && (
                  <td className="px-6 py-4 text-right whitespace-nowrap">
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
                      <span className="text-xs text-gray-500">Renewal required</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-gray-500">No students found</div>
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
