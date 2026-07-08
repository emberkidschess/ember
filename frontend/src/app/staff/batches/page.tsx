"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Calendar, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getBatches, type Batch } from "@/lib/adminApi";
import { formatCourseLevel } from "@/lib/labels";

export default function StaffBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBatches();
      if (data.success) {
        setBatches(data.data || []);
      } else {
        setError(data.error || "Failed to load batches");
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

  const filteredBatches = batches.filter(
    (batch) =>
      batch.name.toLowerCase().includes(search.toLowerCase()) ||
      batch.courseLevel.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-ember)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Batches"
        description="View and manage teaching batches"
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
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-control admin-control-search"
          />
        </div>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table min-w-[760px]">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Level</th>
              <th className="text-left">Schedule</th>
              <th className="text-left">Students</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map((batch) => (
              <tr key={batch._id}>
                <td className="whitespace-nowrap admin-primary-cell">{batch.name}</td>
                <td className="whitespace-nowrap">{formatCourseLevel(batch.courseLevel)}</td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {batch.schedule}
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    {batch.studentCount || 0}
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={batch.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="admin-empty">No batches found</div>
        )}
      </div>
    </div>
  );
}
