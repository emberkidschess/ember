"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ForgotPasswordFormProps {
  portal: "admin" | "staff" | "client";
  title: string;
}

export default function ForgotPasswordForm({ portal, title }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/${portal}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
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
          <p className="text-[var(--color-muted)] text-sm">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="bg-[var(--color-paper)] rounded-3xl shadow-[var(--shadow-card)] border border-[var(--color-line)] p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-pine)]/10 text-[var(--color-pine)] mb-4">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-[var(--color-walnut)] font-semibold mb-1">Check your email</p>
              <p className="text-sm text-[var(--color-muted)]">
                If an account exists for {email}, a password reset link is on its way.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-[var(--color-ember)]/10 border border-[var(--color-ember)]/20 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--color-muted)]" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-11 pr-4 h-[48px] rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-base text-[var(--color-walnut)]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--color-walnut)] hover:bg-[var(--color-ember)] text-[var(--color-paper)] h-[50px] rounded-xl font-bold uppercase tracking-[0.12em] text-[13px] transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href={portal === "client" ? "/student/login" : "/login"}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ember)] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
