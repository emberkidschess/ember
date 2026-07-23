"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, Shield, Key } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import { FormField, inputClass, selectClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "@/components/admin/FormField";
import { getStaffList, createStaffMember, updateStaffMember, deleteStaffMember, toggleStaffStatus, resetStaffPassword, type StaffMember } from "@/lib/adminApi";
import { ALL_PERMISSION_KEYS, PERMISSION_GROUPS } from "@/lib/permissions";

const ROLES = ["coach", "staff"] as const;
const ROLE_PRESETS: Record<StaffFormState["role"], string[]> = {
  coach: [
    "view_students", "schedule_classes", "create_edit_class",
    "assign_students_to_class", "reschedule_class", "cancel_class",
    "post_class_notes", "resolve_attendance_dispute", "override_attendance",
    "create_report_card", "export_report_card", "view_coach_reports",
  ],
  staff: [
    "view_leads", "edit_leads", "convert_lead_to_student", "schedule_trial",
    "mark_trial_result", "view_students", "edit_students", "enroll_student",
    "generate_payment_link", "send_payment_link", "mark_payment_received",
    "view_payment_history",
  ],
};

type StaffFormState = {
  name: string;
  email: string;
  role: "coach" | "staff";
  expertise: string[];
  permissions: string[];
  salaryPerClass: number;
  defaultClassLink: string;
};

const EMPTY_FORM: StaffFormState = {
  name: "",
  email: "",
  role: "staff",
  expertise: [],
  permissions: [],
  salaryPerClass: 0,
  defaultClassLink: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [resetPasswordTarget, setResetPasswordTarget] = useState<StaffMember | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedCredential, setGeneratedCredential] = useState<{ name: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStaffList();
      if (data.success) {
        setStaff(data.data || []);
      } else {
        setError(data.error || "Failed to load staff");
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

  const handleCreate = () => {
    setEditingStaff(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setForm({
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      expertise: staffMember.expertise || [],
      permissions: staffMember.permissions || [],
      salaryPerClass: staffMember.salaryPerClass || 0,
      defaultClassLink: staffMember.defaultClassLink || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (form.role === "coach" && !/^https?:\/\//i.test(form.defaultClassLink.trim())) {
      setError("Enter a valid HTTP or HTTPS Default Class Link before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        expertise: form.role === "coach" ? form.expertise : [],
        salaryPerClass: form.role === "coach" ? form.salaryPerClass : 0,
        defaultClassLink: form.role === "coach" ? form.defaultClassLink.trim() : undefined,
      };
      if (editingStaff) {
        const data = await updateStaffMember(editingStaff._id, payload);
        if (data.success) {
          setModalOpen(false);
          load();
        } else {
          setError(data.error || "Failed to update staff member");
        }
      } else {
        const data = await createStaffMember(payload);
        if (data.success) {
          setModalOpen(false);
          if (data.data.tempPassword) {
            setGeneratedCredential({ name: data.data.name, password: data.data.tempPassword });
          }
          load();
        } else {
          setError(data.error || "Failed to create staff member");
        }
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const data = await deleteStaffMember(deleteTarget._id);
      if (data.success) {
        setDeleteTarget(null);
        load();
      } else {
        setError(data.error || "Failed to delete staff member");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (staffMember: StaffMember) => {
    const newStatus = staffMember.status === "active" ? "inactive" : "active";
    try {
      const data = await toggleStaffStatus(staffMember._id, newStatus);
      if (data.success) {
        load();
      } else {
        setError(data.error || "Failed to update status");
      }
    } catch {
      setError("Could not connect to the server.");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;
    setResettingPassword(true);
    try {
      const data = await resetStaffPassword(resetPasswordTarget._id);
      if (data.success) {
        setGeneratedCredential({
          name: resetPasswordTarget.name,
          password: data.data.tempPassword,
        });
        setResetPasswordTarget(null);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setForm({
      ...form,
      permissions: form.permissions.includes(permission)
        ? form.permissions.filter((p) => p !== permission)
        : [...form.permissions, permission],
    });
  };

  const handleExpertiseToggle = (expertise: string) => {
    setForm({
      ...form,
      expertise: form.expertise.includes(expertise)
        ? form.expertise.filter((e) => e !== expertise)
        : [...form.expertise, expertise],
    });
  };

  const applyPermissionSet = (permissions: string[]) => {
    setForm((current) => ({ ...current, permissions: [...new Set(permissions)] }));
  };

  const togglePermissionGroup = (keys: string[]) => {
    setForm((current) => {
      const selected = new Set(current.permissions);
      const groupIsSelected = keys.every((key) => selected.has(key));
      keys.forEach((key) => groupIsSelected ? selected.delete(key) : selected.add(key));
      return { ...current, permissions: [...selected] };
    });
  };

  const filteredStaff = useMemo(() => {
    let result = staff;
    if (roleFilter) {
      result = result.filter((s) => s.role === roleFilter);
    }
    if (!search) return result;
    const lowerSearch = search.toLowerCase();
    return result.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerSearch) ||
        s.email.toLowerCase().includes(lowerSearch)
    );
  }, [staff, search, roleFilter]);

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage coaches and staff members"
        actions={[
          {
            label: "Add Staff Member",
            icon: Plus,
            onClick: handleCreate,
          },
        ]}
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
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-control admin-control-search"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="admin-control admin-control-select w-full sm:w-auto"
        >
          <option value="">All Roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role.toUpperCase()}
            </option>
          ))}
        </select>
        {(search || roleFilter) && (
          <button type="button" onClick={() => { setSearch(""); setRoleFilter(""); }} className={secondaryButtonClass}>
            Clear filters
          </button>
        )}
      </div>

      {!loading && <p className="mb-4 text-sm text-[var(--color-muted)]">Showing {filteredStaff.length} of {staff.length} team members</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" />
        </div>
      ) : (
        <div className="admin-table-shell">
          <table className="admin-table min-w-full">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
                <th className="text-left">Status</th>
                <th className="text-left">Expertise</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staffMember) => (
                <tr key={staffMember._id}>
                  <td className="whitespace-nowrap admin-primary-cell">{staffMember.name}</td>
                  <td className="whitespace-nowrap">{staffMember.email}</td>
                  <td className="whitespace-nowrap">
                    <span className="admin-role-pill">
                      {staffMember.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={staffMember.status} />
                  </td>
                  <td className="whitespace-nowrap">
                    {staffMember.expertise?.join(", ") || "-"}
                  </td>
                  <td className="whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(staffMember)} className="admin-icon-button mr-2" aria-label={`Edit staff ${staffMember.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setResetPasswordTarget(staffMember)} className="admin-icon-button mr-2" title="Reset Password" aria-label={`Reset password for ${staffMember.name}`}>
                      <Key className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleToggleStatus(staffMember)} className="admin-icon-button mr-2" title="Toggle Status" aria-label={`Toggle status for ${staffMember.name}`}>
                      <Shield className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(staffMember)} className="admin-icon-button admin-icon-button-danger" aria-label={`Delete staff ${staffMember.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <div className="admin-empty">No staff members found</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingStaff ? "Edit Staff Member" : "Add Staff Member"}>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <FormField label="Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Role">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as StaffFormState["role"] })}
              className={selectClass}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role === "coach" ? "Teaching Coach" : "Operations Staff"}
                </option>
              ))}
            </select>
          </FormField>
          {form.role === "coach" && <>
            <FormField label="Salary Per Class">
              <input
                type="number"
                value={form.salaryPerClass}
                onChange={(e) => setForm({ ...form, salaryPerClass: parseFloat(e.target.value) || 0 })}
                className={inputClass}
                min="0"
                step="0.01"
              />
            </FormField>
            <FormField label="Default Class Link" required>
              <input
                type="url"
                required
                placeholder="https://meet.google.com/..."
                value={form.defaultClassLink}
                onChange={(e) => setForm({ ...form, defaultClassLink: e.target.value })}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">Used automatically for every batch this coach teaches.</p>
            </FormField>
            <FormField label="Teaching Expertise">
              <div className="flex flex-wrap gap-2">
                {["Beginner", "Intermediate", "Advanced", "Expert"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleExpertiseToggle(level)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                      form.expertise.includes(level)
                        ? "border-[rgba(217,103,69,0.32)] bg-[var(--color-gold)]/15 text-[var(--color-ember-deep)]"
                        : "border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-muted)] hover:bg-[var(--color-ivory)]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </FormField>
          </>}
          <FormField label="Access">
            <div className="mb-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] p-3">
              <p className="text-sm font-semibold text-[var(--color-walnut)]">{form.permissions.length} of {ALL_PERMISSION_KEYS.length} permissions selected</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Start with a role preset, then make only the exceptions you need.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => applyPermissionSet(ROLE_PRESETS[form.role])} className={secondaryButtonClass}>Apply {form.role === "coach" ? "coach" : "staff"} preset</button>
                <button type="button" onClick={() => applyPermissionSet(ALL_PERMISSION_KEYS)} className={secondaryButtonClass}>Select all</button>
                <button type="button" onClick={() => applyPermissionSet([])} className="px-3 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-walnut)]">Clear all</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERMISSION_GROUPS.map((group) => {
                const keys = group.permissions.map((permission) => permission.key);
                const selectedCount = keys.filter((key) => form.permissions.includes(key)).length;
                const allSelected = selectedCount === keys.length;
                return (
                  <section key={group.group} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[var(--color-walnut)]">{group.group} <span className="font-medium text-[var(--color-muted)]">{selectedCount}/{keys.length}</span></p>
                      <button type="button" onClick={() => togglePermissionGroup(keys)} className="text-xs font-bold text-[var(--color-pine-deep)] hover:underline">{allSelected ? "Clear group" : "Select group"}</button>
                    </div>
                    <div className="space-y-1.5">
                      {group.permissions.map((permission) => (
                        <label key={permission.key} className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-sm text-[var(--color-muted)] hover:bg-[var(--color-ivory)]">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(permission.key)}
                            onChange={() => handlePermissionToggle(permission.key)}
                            className="mt-0.5 rounded border-[var(--color-line)] accent-[var(--color-ember)]"
                          />
                          <span>{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className={secondaryButtonClass}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
            {editingStaff ? "Update" : "Create"}
          </button>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Staff Member">
        <p className="mb-6 text-[var(--color-muted)]">
          Are you sure you want to delete staff member "{deleteTarget?.name}"? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={secondaryButtonClass}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting} className={dangerButtonClass}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
            Delete
          </button>
        </div>
      </Modal>

      <Modal open={!!resetPasswordTarget} onClose={() => setResetPasswordTarget(null)} title="Reset Password">
        <p className="mb-6 text-[var(--color-muted)]">
          Are you sure you want to reset the password for "{resetPasswordTarget?.name}"? A temporary password will be generated.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setResetPasswordTarget(null)} className={secondaryButtonClass}>
            Cancel
          </button>
          <button onClick={handleResetPassword} disabled={resettingPassword} className={primaryButtonClass}>
            {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
            Reset Password
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(generatedCredential)} onClose={() => setGeneratedCredential(null)} title="Temporary Credential">
        <p className="text-sm text-[var(--color-muted)]">
          Share this one-time password securely with {generatedCredential?.name}. It will not be shown again after this dialog closes.
        </p>
        <div className="my-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-ivory)] p-4">
          <code className="break-all text-lg font-bold text-[var(--color-walnut)]">{generatedCredential?.password}</code>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={() => setGeneratedCredential(null)} className={primaryButtonClass}>I have saved it</button>
        </div>
      </Modal>
    </div>
  );
}
