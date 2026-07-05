"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Mail, Crown, GraduationCap } from "lucide-react";
import { login } from "@/lib/auth";
import { inputClass, primaryButtonClass } from "@/components/admin/FormField";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [portalType, setPortalType] = useState<"admin" | "staff">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle switching portals while resetting stale error messages
  const handlePortalChange = (type: "admin" | "staff") => {
    setPortalType(type);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(portalType, email, password);
      if (res.success) {
        router.push(portalType === "admin" ? "/admin/dashboard" : "/staff/dashboard");
      } else {
        setError(res.error || "Login failed. Please check your credentials.");
      }
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-ivory)] to-[var(--color-gold)]/20 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-ember)]/10 mb-4">
            {portalType === "admin" ? (
              <Crown className="h-8 w-8 text-[var(--color-ember)]" aria-hidden="true" />
            ) : (
              <GraduationCap className="h-8 w-8 text-[var(--color-ember)]" aria-hidden="true" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-ember-deep)]">
            {portalType === "admin" ? "Admin Portal" : "Staff Portal"}
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-2">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Portal Toggle Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={portalType === "admin"}
            onClick={() => handlePortalChange("admin")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              portalType === "admin"
                ? "bg-white shadow text-[var(--color-ember)]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={portalType === "staff"}
            onClick={() => handlePortalChange("staff")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              portalType === "staff"
                ? "bg-white shadow text-[var(--color-ember)]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Staff
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            role="alert" 
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                /* pl-10 prevents text from overlapping the left icon */
                className={`${inputClass} w-full pl-10`}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <Link href={`/${portalType}/forgot-password`} className="text-xs font-semibold text-[var(--color-ember)] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                /* pl-10 prevents text from overlapping the left icon */
                className={`${inputClass} w-full pl-10`}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            /* Added flex alignment to ensure spinner and text sit cleanly together */
            className={`${primaryButtonClass} w-full flex items-center justify-center`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer Switcher */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[var(--color-muted)]">
            {portalType === "admin" ? "Staff?" : "Admin?"}{" "}
            <button
              type="button"
              onClick={() => handlePortalChange(portalType === "admin" ? "staff" : "admin")}
              className="text-[var(--color-ember)] hover:underline font-medium"
            >
              Switch to {portalType === "admin" ? "Staff" : "Admin"} Portal
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
