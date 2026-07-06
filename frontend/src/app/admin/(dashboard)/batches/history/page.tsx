"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getBatchHistory, type Batch } from "@/lib/adminApi";
import Link from "next/link";
import { secondaryButtonClass } from "@/components/admin/FormField";
import { formatCourseLevel } from "@/lib/labels";

export default function BatchHistoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getBatchHistory();
        if (res.success) setBatches(res.data);
        else setError(res.error || "Failed to load batch history");
      } catch {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Batch History"
        description="All completed batches."
        actions={
          <Link href="/admin/batches" className={secondaryButtonClass}>
            ← Back to Batches
          </Link>
        }
      />

      {error && <div className="bg-[var(--color-ember)]/10 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-[var(--color-ember)] animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <p className="text-center py-16 text-sm text-[var(--color-muted)]">No completed batches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  <th className="px-5 py-3">Batch</th>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Coach</th>
                  <th className="px-5 py-3">Students</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {batches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-[var(--color-ivory)]/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--color-walnut)]">{batch.name}</p>
                      {batch.schedule && <p className="text-xs text-[var(--color-muted)]">{batch.schedule}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">{formatCourseLevel(batch.courseLevel)}</td>
                    <td className="px-5 py-3.5 text-[var(--color-walnut)]">
                      {typeof batch.coach === "object" ? batch.coach.name : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                        <Users className="h-3.5 w-3.5" /> {batch.students?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-muted)]">
                      {batch.completedAt ? new Date(batch.completedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={batch.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
