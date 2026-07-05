"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { getCurrentStudent, loginStudent, verifyStudentSession } from "@/lib/studentAuth";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkExistingSession = async () => {
      let redirecting = false;
      try {
        if (getCurrentStudent() && (await verifyStudentSession())) {
          redirecting = true;
          router.replace("/student/dashboard");
          return;
        }
      } catch {
        setError("Could not verify an existing session. You can still sign in below.");
      } finally {
        if (!redirecting) setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginStudent(email, password);
      if (!response.success) {
        setError(response.error || "Invalid email or password.");
        return;
      }
      router.replace("/student/dashboard");
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf6ec] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-walnut)]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf6ec] px-4 py-12">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-black/5 md:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-[var(--color-walnut)] p-8 text-white sm:p-10">
          <Link href="/" className="text-sm font-semibold text-white/80 hover:text-white">
            ← Back to academy
          </Link>
          <div className="mt-20">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Student Portal</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">Track classes, attendance, and chess growth.</h1>
            <p className="mt-5 text-white/75">
              Use the credentials sent by the academy after your package activation.
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <h2 className="text-3xl font-bold text-[var(--color-walnut)]">Sign in</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Access your class schedule and progress dashboard.</p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-walnut)]">Email</span>
                <span className="mt-2 flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--color-walnut)]/30">
                  <Mail className="h-5 w-5 text-[var(--color-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm outline-none"
                    placeholder="student@example.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-walnut)]">Password</span>
                  <Link href="/student/forgot-password" className="text-xs font-semibold text-[var(--color-walnut)] hover:underline">Forgot password?</Link>
                </span>
                <span className="mt-2 flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--color-walnut)]/30">
                  <LockKeyhole className="h-5 w-5 text-[var(--color-muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm outline-none"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-walnut)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-walnut)]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in to dashboard
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
              Need help signing in? Contact the academy team to reset your student password.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
