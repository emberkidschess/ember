import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHero from "@/components/shared/PageHero";

export const metadata: Metadata = {
  title: "Terms of Service - EmberKids Chess Academy",
  description: "Read the terms of service for EmberKids Chess Academy to understand your rights and responsibilities.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] pb-20">
      <PageHero
        title="Terms of Service"
        description="Read the terms of service for EmberKids Chess Academy to understand your rights and responsibilities."
      />
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-ember)] font-bold hover:gap-3 transition-all mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <p className="text-[var(--color-muted)] mb-12">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Agreement to Terms</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              By accessing or using EmberKids Chess Academy's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Services</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              EmberKids Chess Academy provides online chess education services including live classes, curriculum materials, and coaching. We reserve the right to modify, suspend, or discontinue any service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">User Accounts</h2>
            <div className="space-y-4 text-[var(--color-muted)]">
              <p>To use our services, you may be required to create an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Fees and Payments</h2>
            <div className="space-y-4 text-[var(--color-muted)]">
              <p>Our services are subject to fees as described on our website. By subscribing to our services, you agree to pay all applicable fees.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fees are non-refundable unless otherwise stated</li>
                <li>We reserve the right to change fees at any time</li>
                <li>Payment is due at the time of enrollment</li>
                <li>Late payments may result in service suspension</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Class Attendance and Conduct</h2>
            <div className="space-y-4 text-[var(--color-muted)]">
              <p>Students are expected to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Attend scheduled classes on time</li>
                <li>Respect coaches and fellow students</li>
                <li>Follow classroom rules and guidelines</li>
                <li>Maintain appropriate behavior during sessions</li>
              </ul>
              <p className="mt-4">
                We reserve the right to dismiss students who violate these policies without refund.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Intellectual Property</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              All content on our platform, including lessons, materials, videos, and curriculum, is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Limitation of Liability</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              EmberKids Chess Academy shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Termination</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              We may terminate or suspend your account at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the services will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Governing Law</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              These Terms of Service are governed by the laws applicable in the jurisdiction where the academy operator is established, without regard to conflict-of-law rules. Any dispute will be submitted to a court with lawful jurisdiction over the operator, unless applicable consumer law requires otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Contact Us</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-[var(--color-muted)] leading-relaxed mt-2">
              Email: hello@emberkids.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
