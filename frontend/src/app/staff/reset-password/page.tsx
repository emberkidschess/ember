import { Suspense } from "react";
import ResetPasswordForm from "@/components/admin/ResetPasswordForm";

export default function StaffResetPasswordPage() {
  return <Suspense><ResetPasswordForm portal="staff" title="Choose a New Staff Password" /></Suspense>;
}
