import DashboardShell from "@/components/admin/DashboardShell";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell portal="admin">{children}</DashboardShell>;
}
