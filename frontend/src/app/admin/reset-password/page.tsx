import { Suspense } from "react";
import ResetPasswordForm from "@/components/admin/ResetPasswordForm";

export default function AdminResetPasswordPage() {
  return <Suspense><ResetPasswordForm portal="admin" title="Choose a New Admin Password" /></Suspense>;
}
