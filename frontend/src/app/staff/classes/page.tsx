"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Calendar, Clock, CheckCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getClasses, type ClassItem } from "@/lib/adminApi";

function getBatchName(batch: ClassItem["batch"]) {
  if (!batch) return "Individual";
  return typeof batch === "string" ? "Assigned batch" : batch.name;
}

function getClassDuration(startTime: string, endTime: string) {
  const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes > 0 ? `${minutes} min` : "—";
}

export default function StaffClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getClasses();
      if (data.success) {
        setClasses(data.data || []);
      } else {
        setError(data.error || "Failed to load classes");
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

  const filteredClasses = classes.filter(
    (cls) =>
      cls.course.toLowerCase().includes(search.toLowerCase()) ||
      getBatchName(cls.batch).toLowerCase().includes(search.toLowerCase())
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
        title="Classes"
        description="View and manage scheduled classes"
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
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-[800px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClasses.map((cls) => (
              <tr key={cls._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{cls.course}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{getBatchName(cls.batch)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {new Date(cls.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Clock className="h-4 w-4" />
                    {cls.startTime}–{cls.endTime} {cls.timezone}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{getClassDuration(cls.startTime, cls.endTime)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {cls.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    <StatusBadge status={cls.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClasses.length === 0 && (
          <div className="text-center py-12 text-gray-500">No classes found</div>
        )}
      </div>
    </div>
  );
}
