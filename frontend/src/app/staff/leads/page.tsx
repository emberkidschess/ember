"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Mail, Phone, RefreshCw } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { secondaryButtonClass } from "@/components/admin/FormField";
import { getLeads, type Lead } from "@/lib/adminApi";
import { toTitleLabel } from "@/lib/labels";

export default function StaffLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
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
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLeads = leads.filter(
    (lead) =>
      lead.studentName.toLowerCase().includes(search.toLowerCase()) ||
      lead.parentName.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Leads" description="View and manage potential student inquiries" />
        <div className="flex justify-center py-12" role="status" aria-label="Loading leads">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="View and manage potential student inquiries"
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
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-control admin-control-search"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{filteredLeads.length} shown</span>
          <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButtonClass}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

        <div className="admin-table-shell">
          <table className="admin-table min-w-[900px]">
          <thead>
            <tr>
              <th className="text-left">Student</th>
              <th className="text-left">Parent</th>
              <th className="text-left">Contact</th>
              <th className="text-left">Interest</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead._id}>
                <td className="whitespace-nowrap admin-primary-cell">{lead.studentName}</td>
                <td className="whitespace-nowrap">{lead.parentName}</td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    {lead.phoneNumber || "—"}
                  </div>
                </td>
                <td className="whitespace-nowrap">{toTitleLabel(lead.courseInterest)}</td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={lead.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <div className="admin-empty">{search.trim() ? `No leads match “${search.trim()}”.` : "No leads found"}</div>
        )}
      </div>
    </div>
  );
}
