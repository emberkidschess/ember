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
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

const ROLES = ["coach", "staff"] as const;
const PERMISSIONS = ALL_PERMISSION_KEYS;

type StaffFormState = {
  name: string;
  email: string;
  role: "coach" | "staff";
  expertise: string[];
  permissions: string[];
  salaryPerClass: number;
};

const EMPTY_FORM: StaffFormState = {
  name: "",
  email: "",
  role: "staff",
  expertise: [],
  permissions: [],
  salaryPerClass: 0,
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
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingStaff) {
        const data = await updateStaffMember(editingStaff._id, form);
        if (data.success) {
          setModalOpen(false);
          load();
        } else {
          setError(data.error || "Failed to update staff member");
        }
      } else {
        const data = await createStaffMember(form);
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
    <div className="p-6">
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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expertise</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map((staffMember) => (
                <tr key={staffMember._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{staffMember.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{staffMember.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {staffMember.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={staffMember.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {staffMember.expertise?.join(", ") || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(staffMember)} className="text-blue-600 hover:text-blue-900 mr-3">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => setResetPasswordTarget(staffMember)} className="text-orange-600 hover:text-orange-900 mr-3" title="Reset Password">
                      <Key className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => handleToggleStatus(staffMember)} className="text-purple-600 hover:text-purple-900 mr-3" title="Toggle Status">
                      <Shield className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => setDeleteTarget(staffMember)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <div className="text-center py-12 text-gray-500">No staff members found</div>
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
                  {role.toUpperCase()}
                </option>
              ))}
            </select>
          </FormField>
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
          <FormField label="Expertise">
            <div className="flex flex-wrap gap-2">
              {["Beginner", "Intermediate", "Advanced", "Expert"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleExpertiseToggle(level)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    form.expertise.includes(level)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Permissions">
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    className="rounded border-gray-300"
                  />
                  {permission.replace(/_/g, " ")}
                </label>
              ))}
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
        <p className="text-gray-600 mb-6">
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
        <p className="text-gray-600 mb-6">
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
        <p className="text-sm text-gray-600">
          Share this one-time password securely with {generatedCredential?.name}. It will not be shown again after this dialog closes.
        </p>
        <div className="my-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <code className="break-all text-lg font-semibold text-gray-900">{generatedCredential?.password}</code>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={() => setGeneratedCredential(null)} className={primaryButtonClass}>I have saved it</button>
        </div>
      </Modal>
    </div>
  );
}
