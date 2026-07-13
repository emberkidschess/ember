import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHero from "@/components/shared/PageHero";

export const metadata: Metadata = {
  title: "Privacy Policy - EmberKids Chess Academy",
  description: "Learn about how EmberKids Chess Academy protects your privacy and handles your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] pb-20">
      <PageHero
        title="Privacy Policy"
        description="Learn about how EmberKids Chess Academy protects your privacy and handles your personal information."
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
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Introduction</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              EmberKids Chess Academy ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Information We Collect</h2>
            <div className="space-y-4 text-[var(--color-muted)]">
              <p>We may collect the following types of personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact information (name, email address, phone number)</li>
                <li>Student information (age, grade level, chess experience)</li>
                <li>Parent/guardian information</li>
                <li>Payment information (processed securely through third-party payment processors)</li>
                <li>Usage data and browsing history</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">How We Use Your Information</h2>
            <div className="space-y-4 text-[var(--color-muted)]">
              <p>We use your personal information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and improve our chess education services</li>
                <li>To communicate with you about classes, schedules, and updates</li>
                <li>To process payments and manage subscriptions</li>
                <li>To send you relevant educational content and promotional materials (with your consent)</li>
                <li>To analyze usage patterns and improve user experience</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Data Security</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Children's Privacy</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              Our services are designed for children under the age of 18. We collect personal information from children only with verifiable parental consent. Parents and guardians may review, request deletion of, and refuse to permit further collection or use of their child's personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Your Rights</h2>
            <div className="space-y-4 text-[var(--color-muted)]">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-walnut)] mb-4">Contact Us</h2>
            <p className="text-[var(--color-muted)] leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-[var(--color-muted)] leading-relaxed mt-2">
              Email: {process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@emberkidschess.com"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
