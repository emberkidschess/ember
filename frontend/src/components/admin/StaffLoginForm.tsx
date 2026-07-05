"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { login } from "@/lib/auth";

interface StaffLoginFormProps {
  portal: "admin" | "staff";
  title: string;
  subtitle: string;
  redirectTo: string;
}

export default function StaffLoginForm({ portal, title, subtitle, redirectTo }: StaffLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(portal, email, password);

      if (data.success && data.data) {
        router.push(redirectTo);
      } else {
        setError(data.error || "Login failed. Check your email and password.");
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-walnut)] text-[var(--color-paper)] mb-5">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-walnut)] mb-2">
            {title}
          </h1>
          <p className="text-[var(--color-muted)] text-sm">{subtitle}</p>
        </div>

        <div className="bg-[var(--color-paper)] rounded-3xl shadow-[var(--shadow-card)] border border-[var(--color-line)] p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 bg-[var(--color-ember)]/10 border border-[var(--color-ember)]/20 text-[var(--color-ember-deep)] px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Password
                </label>
                <Link
                  href={`/${portal}/forgot-password`}
                  className="text-xs font-semibold text-[var(--color-ember)] hover:text-[var(--color-ember-deep)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--color-muted)]" aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 h-[48px] rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] focus:bg-white focus:border-[var(--color-ember)] focus:ring-4 focus:ring-[var(--color-ember)]/10 outline-none transition-all text-base text-[var(--color-walnut)]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-walnut)] hover:bg-[var(--color-ember)] text-[var(--color-paper)] h-[50px] rounded-xl font-bold uppercase tracking-[0.12em] text-[13px] shadow-[0_8px_15px_-8px_rgba(0,0,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ember)] transition-colors">
              ← Back to website
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-muted)] mt-6">
          {portal === "admin" ? (
            <>Staff member? <Link href="/staff/login" className="font-semibold text-[var(--color-ember)] hover:underline">Sign in here</Link></>
          ) : (
            <>Admin? <Link href="/admin/login" className="font-semibold text-[var(--color-ember)] hover:underline">Sign in here</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
