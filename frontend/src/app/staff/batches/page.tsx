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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Batches"
        description="View and manage teaching batches"
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
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-[760px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBatches.map((batch) => (
              <tr key={batch._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{batch.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatCourseLevel(batch.courseLevel)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {batch.schedule}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    {batch.studentCount || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={batch.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="text-center py-12 text-gray-500">No batches found</div>
        )}
      </div>
    </div>
  );
}
