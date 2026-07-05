"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ResetPasswordFormProps {
  portal: "admin" | "staff" | "client";
  title: string;
}

export default function ResetPasswordForm({ portal, title }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token || !email) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/${portal}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push(portal === "client" ? "/student/login" : "/login"), 2000);
      } else {
        setError(data.error || "This reset link is invalid or has expired.");
      }
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-ivory)] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-walnut)] mb-2">
            {title}
          </h1>
          <p className="text-[var(--color-muted)] text-sm">Choose a new password for your account.</p>
        </div>

        <div className="bg-[var(--color-paper)] rounded-3xl shadow-[var(--shadow-card)] border border-[var(--color-line)] p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine)]/10 text-[var(--color-pine)] mb-4">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-[var(--color-walnut)] font-semibold mb-1">Password updated</p>
              <p className="text-sm text-[var(--color-muted)]">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 bg-[var(--color-ember)]/10 border border-[var(--color-ember)]/20 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--color-muted)]" aria-hidden="true" />
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full pl-11 pr-4 h-[48px] rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-base text-[var(--color-walnut)]"
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--color-muted)]" aria-hidden="true" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full pl-11 pr-4 h-[48px] rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-base text-[var(--color-walnut)]"
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--color-walnut)] hover:bg-[var(--color-ember)] text-[var(--color-paper)] h-[50px] rounded-xl font-bold uppercase tracking-[0.12em] text-[13px] transition-all disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href={portal === "client" ? "/student/login" : "/login"} className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ember)] transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
