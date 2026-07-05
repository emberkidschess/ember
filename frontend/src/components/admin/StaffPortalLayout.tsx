"use client";

import { usePathname } from "next/navigation";
import DashboardShell from "@/components/admin/DashboardShell";

const PUBLIC_STAFF_PATHS = ["/staff/forgot-password", "/staff/reset-password"];

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicStaffPath = PUBLIC_STAFF_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(path + "/")
  );

  if (isPublicStaffPath) {
    return <>{children}</>;
  }

  return <DashboardShell portal="staff">{children}</DashboardShell>;
}
