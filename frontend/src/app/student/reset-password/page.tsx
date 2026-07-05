import { Suspense } from "react";
import ResetPasswordForm from "@/components/admin/ResetPasswordForm";

export default function StudentResetPasswordPage() {
  return <Suspense><ResetPasswordForm portal="client" title="Choose a New Student Password" /></Suspense>;
}
