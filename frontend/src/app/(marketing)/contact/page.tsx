"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Mail, Phone, Send, MessageSquare, CheckCircle, ChevronDown, ArrowUpRight } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa6";
import { fadeUp, stagger, viewportConfig } from "@/components/shared/animations";
import PageHero from "@/components/shared/PageHero";
import GridBackground from "@/components/shared/GridBackground";
import type { ContactItem } from "@/types";
import { submitInquiry } from "@/lib/api";
import { useSiteConfig } from "@/lib/site";
import { COUNTRY_OPTIONS, formatPhoneInput, type SupportedCountry } from "@/lib/phone";

const NEXT_STEPS = [
  { icon: MessageSquare, title: "We Review", desc: "Our team reviews your inquiry within 24 hours." },
  { icon: Phone,        title: "We Call",   desc: "A coach reaches out to understand your child's needs." },
  { icon: CheckCircle, title: "We Schedule", desc: "We book a free 30-min assessment session." },
];

export default function ContactPage() {
  const [sent, setSent]               = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", country: "US" as SupportedCountry, message: "",
  });
  const { siteConfig } = useSiteConfig();
  const profile = siteConfig?.profile;

  const hasPhone = Boolean(profile?.phone && profile.phoneHref?.startsWith("tel:"));
  const hasWhatsapp = Boolean(profile?.whatsappHref?.startsWith("https://"));
  const contactItems: ContactItem[] = [
    { icon: Mail, title: "Email", info: profile?.email || "hello@emberkids.com" },
    ...(hasPhone ? [{ icon: Phone, title: "Phone", info: profile!.phone }] : []),
    ...(hasWhatsapp ? [{ icon: MessageSquare, title: "WhatsApp", info: profile?.supportLine || "Chat with us on WhatsApp" }] : []),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: name === "phone" ? formatPhoneInput(value, p.country) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await submitInquiry(formData);
      setSent(true);
      setSubmitError("");
      setFormData({ name: "", email: "", phone: "", country: "US", message: "" });
      setTimeout(() => setSent(false), 4000);
    } catch {
      setSubmitError("We couldn't send this right now. Please email the academy team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = `
    w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] px-4 py-3.5
    text-[var(--color-walnut)] placeholder:text-[var(--color-muted)]/50 text-sm
    outline-none transition-all duration-200
    focus:border-[var(--color-ember)] focus:ring-2 focus:ring-[var(--color-ember)]/10
  `;

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-walnut)] overflow-hidden">
      <div className="relative">
        <GridBackground variant="dot" opacity={0.022} size={44} />
        <PageHero
          title="Let's Start Your Chess Journey"
          description="Have questions about our curriculum, coaching, or admissions? Our team is here to help you get started."
        />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-7xl px-6 md:px-12 pb-24"
      >
        {/* ── Main grid: form + sidebar ── */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">

          {/* Form */}
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-[var(--color-paper)] rounded-3xl p-8 md:p-10 shadow-[var(--shadow-card)] border border-[var(--color-line)]"
            >
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[var(--color-walnut)] mb-8">
                Send Us a Message
              </h2>

              <div className="grid md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label htmlFor="c-name" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Your Name
                  </label>
                  <input id="c-name" type="text" name="name" value={formData.name} onChange={handleChange}
                    className={inputClass} placeholder="Parent / Student Name" required />
                </div>
                <div>
                  <label htmlFor="c-email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Email Address
                  </label>
                  <input id="c-email" type="email" name="email" value={formData.email} onChange={handleChange}
                    className={inputClass} placeholder="you@example.com" required />
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="c-phone" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Phone Number
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative sm:shrink-0">
                    <select
                      id="c-country" name="country" aria-label="Country"
                      value={formData.country}
                      onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value as SupportedCountry }))}
                      className="h-full w-full sm:w-auto pl-4 pr-9 py-3.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-ivory)] outline-none transition-all focus:border-[var(--color-ember)] focus:ring-2 focus:ring-[var(--color-ember)]/10 appearance-none cursor-pointer text-sm"
                    >
                      {COUNTRY_OPTIONS.map((o) => (
                        <option key={o.code} value={o.code}>{o.flag} {o.dialCode}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" />
                  </div>
                  <input id="c-phone" type="tel" name="phone" inputMode="numeric" maxLength={14}
                    value={formData.phone} onChange={handleChange}
                    className={inputClass} placeholder="(555) 123-4567" required />
                </div>
              </div>

              <div className="mb-7">
                <label htmlFor="c-message" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Message
                </label>
                <textarea id="c-message" name="message" rows={5} value={formData.message} onChange={handleChange}
                  className={`${inputClass} resize-none`}
                  placeholder="Tell us about your child's chess experience, age, and goals..." required />
              </div>

              <button
                type="submit" disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[var(--color-ember)] py-4 font-bold text-white transition-all duration-300 hover:bg-[var(--color-ember-deep)] hover:shadow-[0_8px_30px_-6px_rgba(199,93,60,0.5)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] text-sm uppercase tracking-wider"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending…" : sent ? "Inquiry Received ✓" : "Send Inquiry"}
              </button>

              {submitError && (
                <p className="mt-4 text-sm font-medium text-[var(--color-ember)] bg-[var(--color-ember)]/8 p-3 rounded-lg">
                  {submitError}
                </p>
              )}
            </form>
          </motion.div>

          {/* Sidebar */}
          <motion.div variants={stagger} className="space-y-5">
            {/* Contact info card */}
            <motion.div variants={fadeUp} className="bg-[var(--color-paper)] rounded-3xl p-6 shadow-[var(--shadow-card)] border border-[var(--color-line)]">
              <h3 className="font-[family-name:var(--font-playfair)] text-xl mb-6 text-[var(--color-walnut)]">
                Contact Info
              </h3>
              <div className="space-y-5">
                {contactItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-ember)]/10">
                      <item.icon className="h-5 w-5 text-[var(--color-ember)]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-walnut)]">{item.title}</h4>
                      <p className="text-sm text-[var(--color-muted)] mt-0.5">{item.info}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Response time */}
            <motion.div variants={fadeUp} className="bg-[var(--color-walnut)] rounded-3xl p-6 text-[var(--color-paper)] relative overflow-hidden">
              <GridBackground variant="dot" color="white" opacity={0.04} size={28} />
              <div className="relative z-10">
                <h3 className="font-[family-name:var(--font-playfair)] text-xl mb-3">Quick Response</h3>
                <p className="text-[var(--color-muted)] text-sm mb-4 leading-relaxed">
                  We typically respond within 24 hours on business days.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-[var(--color-gold)]" />
                  <span>Mon – Sat · 9 AM – 7 PM</span>
                </div>
              </div>
            </motion.div>

            {/* WhatsApp CTA */}
            {hasWhatsapp && (
              <motion.div variants={fadeUp}>
                <a
                  href={profile!.whatsappHref}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full rounded-3xl bg-[#25D366] text-white font-bold py-4 px-6 text-sm uppercase tracking-wider hover:bg-[#1ebe5d] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <FaWhatsapp className="w-5 h-5" />
                  Chat on WhatsApp
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </motion.div>
            )}

            {/* Instagram */}
            <motion.div variants={fadeUp}>
              <a
                href="https://www.instagram.com/emberkids"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full rounded-3xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-bold py-4 px-6 text-sm uppercase tracking-wider hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <FaInstagram className="w-5 h-5" />
                Follow on Instagram
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Next Steps ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="bg-[var(--color-paper)] rounded-3xl p-8 md:p-12 shadow-[var(--shadow-card)] border border-[var(--color-line)]"
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl mb-10 text-center">
            What Happens Next?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {NEXT_STEPS.map((step, idx) => (
              <div key={idx} className="text-center group">
                <div className="flex h-16 w-16 mx-auto mb-5 items-center justify-center rounded-2xl bg-[var(--color-ember)]/10 group-hover:bg-[var(--color-ember)] transition-colors duration-300">
                  <step.icon className="h-7 w-7 text-[var(--color-ember)] group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
                  Step {idx + 1}
                </div>
                <h3 className="font-bold text-[var(--color-walnut)] mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
