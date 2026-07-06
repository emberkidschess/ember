"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, Mail, Phone } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import { FormField, inputClass, selectClass, textareaClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "@/components/admin/FormField";
import { getLeads, createLead, updateLead, deleteLead, type Lead } from "@/lib/adminApi";
import { COUNTRY_OPTIONS, formatPhoneInput, type SupportedCountry } from "@/lib/phone";
import { formatLeadCategory, toTitleLabel } from "@/lib/labels";

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const LEAD_SOURCES = ["website", "referral", "social_media", "advertisement", "event", "word_of_mouth", "other"];
const LEAD_CATEGORIES = ["beginner", "intermediate", "advanced", "competitive", "hobbyist"];

type LeadFormState = {
  studentName: string;
  parentName: string;
  phoneNumber: string;
  country: "US" | "CA" | "IN" | "SA" | "AE" | "QA" | "KW" | "BH" | "OM";
  email: string;
  courseInterest: string;
  leadSource: string;
  leadCategory: string;
  status: string;
  notes: string;
};

const EMPTY_FORM: LeadFormState = {
  studentName: "",
  parentName: "",
  phoneNumber: "",
  country: "US",
  email: "",
  courseInterest: "",
  leadSource: "website",
  leadCategory: "beginner",
  status: "new",
  notes: "",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      if (data.success) {
        setLeads(data.data || []);
      } else {
        setError(data.error || "Failed to load leads");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditingLead(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      studentName: lead.studentName,
      parentName: lead.parentName,
      phoneNumber: lead.phoneNumber,
      country: lead.country || "US",
      email: lead.email,
      courseInterest: lead.courseInterest,
      leadSource: lead.leadSource,
      leadCategory: lead.leadCategory,
      status: lead.status,
      notes: lead.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingLead) {
        const data = await updateLead(editingLead._id, form);
        if (data.success) {
          setModalOpen(false);
          load();
        } else {
          setError(data.error || "Failed to update lead");
        }
      } else {
        const data = await createLead(form);
        if (data.success) {
          setModalOpen(false);
          load();
        } else {
          setError(data.error || "Failed to create lead");
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
      const data = await deleteLead(deleteTarget._id);
      if (data.success) {
        setDeleteTarget(null);
        load();
      } else {
        setError(data.error || "Failed to delete lead");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredLeads = useMemo(() => {
    let filtered = leads;
    if (statusFilter) {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }
    if (!search) return filtered;
    const lowerSearch = search.toLowerCase();
    return filtered.filter(
      (lead) =>
        lead.studentName.toLowerCase().includes(lowerSearch) ||
        lead.parentName.toLowerCase().includes(lowerSearch) ||
        lead.email.toLowerCase().includes(lowerSearch) ||
        lead.phoneNumber.includes(lowerSearch)
    );
  }, [leads, search, statusFilter]);

  return (
    <div className="p-6">
      <PageHeader
        title="Leads"
        description="Manage potential student inquiries and conversions"
        actions={[
          {
            label: "Add Lead",
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
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ").toUpperCase()}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{lead.studentName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.parentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Phone className="h-4 w-4" />
                      {lead.phoneNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{toTitleLabel(lead.courseInterest)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{toTitleLabel(lead.leadSource)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.convertedToStudent ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Yes</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(lead)} className="text-blue-600 hover:text-blue-900 mr-3">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => setDeleteTarget(lead)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="text-center py-12 text-gray-500">No leads found</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? "Edit Lead" : "Add Lead"}>
        <div className="space-y-4">
          <FormField label="Student Name" required>
            <input
              type="text"
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Parent Name" required>
            <input
              type="text"
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
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
          <FormField label="Phone Number" required>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value as SupportedCountry })}
              className="mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: formatPhoneInput(e.target.value) })}
              className={inputClass}
              placeholder="Enter phone number"
            />
          </FormField>
          <FormField label="Course Interest">
            <input
              type="text"
              value={form.courseInterest}
              onChange={(e) => setForm({ ...form, courseInterest: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Lead Source">
            <select
              value={form.leadSource}
              onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
              className={selectClass}
            >
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {toTitleLabel(source)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Lead Category">
            <select
              value={form.leadCategory}
              onChange={(e) => setForm({ ...form, leadCategory: e.target.value })}
              className={selectClass}
            >
              {LEAD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatLeadCategory(category)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={selectClass}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={textareaClass}
              rows={3}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className={secondaryButtonClass}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
            {editingLead ? "Update" : "Create"}
          </button>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Lead">
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete lead "{deleteTarget?.studentName}"? This action cannot be undone.
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
    </div>
  );
}
