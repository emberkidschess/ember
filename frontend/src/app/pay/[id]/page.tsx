"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clipboard, Clock, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

type PaymentDetails = {
  businessName?: string;
  recipientName?: string;
  recipientEmail?: string;
  paymentUrl?: string;
};

type PublicPaymentLink = {
  id: string;
  amount: number;
  currency: string;
  packageType?: string;
  courseLevel?: string;
  status: "active" | "expired" | "waiting_for_activation" | "activated" | "cancelled";
  paymentMethod?: "wise";
  expiresAt: string;
  studentName: string;
  paymentInstructions?: string | null;
  paymentDetails?: PaymentDetails | null;
};

type ApiResponse = {
  success: boolean;
  data?: PublicPaymentLink;
  error?: string;
  message?: string;
};

const statusCopy: Record<PublicPaymentLink["status"], { label: string; tone: string; icon: typeof Clock }> = {
  active: { label: "Payment pending", tone: "bg-amber-100 text-amber-800", icon: Clock },
  expired: { label: "Link expired", tone: "bg-red-100 text-red-800", icon: XCircle },
  waiting_for_activation: { label: "Payment received", tone: "bg-blue-100 text-blue-800", icon: ShieldCheck },
  activated: { label: "Package activated", tone: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Link cancelled", tone: "bg-gray-100 text-gray-700", icon: XCircle },
};

export default function PublicPaymentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [paymentLink, setPaymentLink] = useState<PublicPaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const loadPaymentLink = async () => {
      if (!apiUrl || !id) {
        setError("Payment page is not configured correctly.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/payment-links/public/${id}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResponse;

        if (!response.ok || !result.success || !result.data) {
          setError(result.error || result.message || "Payment link could not be loaded.");
          return;
        }

        setPaymentLink(result.data);
      } catch {
        setError("Could not connect to the payment server. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadPaymentLink();
  }, [apiUrl, id]);

  const isPayable = paymentLink?.status === "active";
  const status = paymentLink ? statusCopy[paymentLink.status] : null;
  const StatusIcon = status?.icon ?? Clock;

  const paymentInstructionLines = useMemo(
    () => paymentLink?.paymentInstructions?.split("\n").filter(Boolean) ?? [],
    [paymentLink?.paymentInstructions]
  );

  const handleCopy = async () => {
    if (!paymentLink) return;
    const text = [
      `${paymentLink.packageType || "Chess package"} for ${paymentLink.studentName}`,
      `Amount: ${formatCurrency(paymentLink.amount, paymentLink.currency)}`,
      ...(paymentInstructionLines.length ? ["", ...paymentInstructionLines] : []),
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fbf6ec] px-4 py-20">
        <div className="mx-auto flex max-w-xl items-center justify-center rounded-3xl bg-white p-12 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-walnut)]" />
        </div>
      </main>
    );
  }

  if (error || !paymentLink) {
    return (
      <main className="min-h-screen bg-[#fbf6ec] px-4 py-20">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <XCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-bold text-[var(--color-walnut)]">Payment link unavailable</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">{error || "This payment link could not be found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf6ec] px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-black/5">
        <div className="bg-[var(--color-walnut)] px-6 py-8 text-white sm:px-10">
          <div className={`mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status?.tone}`}>
            <StatusIcon className="h-4 w-4" />
            {status?.label}
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">EmberKids Chess Academy</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Package payment</h1>
          <p className="mt-3 text-white/80">
            Wise payment instructions for {paymentLink.studentName}. Once paid, share your transfer reference with the academy team.
          </p>
        </div>

        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="rounded-2xl border border-black/10 bg-[#fffaf1] p-5">
              <p className="text-sm text-[var(--color-muted)]">Amount due</p>
              <p className="mt-1 text-4xl font-bold text-[var(--color-walnut)]">
                {formatCurrency(paymentLink.amount, paymentLink.currency)}
              </p>
              <div className="mt-5 grid gap-3 text-sm text-[var(--color-muted)] sm:grid-cols-2">
                <div>
                  <span className="block font-semibold text-[var(--color-walnut)]">Package</span>
                  {paymentLink.packageType || "Chess package"}
                </div>
                <div>
                  <span className="block font-semibold text-[var(--color-walnut)]">Level</span>
                  {paymentLink.courseLevel || "Assigned level"}
                </div>
                <div>
                  <span className="block font-semibold text-[var(--color-walnut)]">Method</span>
                  {(paymentLink.paymentMethod || "wise").toUpperCase()}
                </div>
                <div>
                  <span className="block font-semibold text-[var(--color-walnut)]">Expires</span>
                  {new Date(paymentLink.expiresAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 p-5">
              <h2 className="text-lg font-bold text-[var(--color-walnut)]">How to pay</h2>
              {paymentInstructionLines.length > 0 ? (
                <div className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
                  {paymentInstructionLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  Please contact the academy team for payment instructions.
                </p>
              )}

              {(paymentLink.paymentDetails?.recipientName || paymentLink.paymentDetails?.recipientEmail || paymentLink.paymentDetails?.paymentUrl) && (
                <dl className="mt-5 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm">
                  {paymentLink.paymentDetails.businessName && (
                    <div>
                      <dt className="font-semibold text-gray-900">Business</dt>
                      <dd className="text-gray-600">{paymentLink.paymentDetails.businessName}</dd>
                    </div>
                  )}
                  {paymentLink.paymentDetails.recipientName && (
                    <div>
                      <dt className="font-semibold text-gray-900">Recipient</dt>
                      <dd className="text-gray-600">{paymentLink.paymentDetails.recipientName}</dd>
                    </div>
                  )}
                  {paymentLink.paymentDetails.recipientEmail && (
                    <div>
                      <dt className="font-semibold text-gray-900">Wise email</dt>
                      <dd className="text-gray-600">{paymentLink.paymentDetails.recipientEmail}</dd>
                    </div>
                  )}
                  {paymentLink.paymentDetails.paymentUrl && (
                    <div>
                      <dt className="font-semibold text-gray-900">Wise link</dt>
                      <dd>
                        <a className="text-[var(--color-walnut)] underline" href={paymentLink.paymentDetails.paymentUrl} target="_blank" rel="noreferrer">
                          Open Wise payment link
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-walnut)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-walnut)]/90"
              >
                <Clipboard className="h-4 w-4" />
                {copied ? "Copied" : "Copy instructions"}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-black/10 p-5 text-center">
            <div className="rounded-2xl bg-gray-50 p-6">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[var(--color-walnut)]" />
              <p className="text-sm font-semibold text-[var(--color-walnut)]">Wise manual verification</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Pay through Wise, then send the receipt/reference. The academy team will verify it and activate the package.
              </p>
              {paymentLink.paymentDetails?.paymentUrl && (
                <a
                  href={paymentLink.paymentDetails.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-walnut)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-walnut)]/90"
                >
                  Open Wise
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {!isPayable && (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-left text-xs text-amber-800">
                This link is not currently payable. Please contact the academy team if you need a fresh payment link.
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
