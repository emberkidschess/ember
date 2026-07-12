"use client";

import Link from "next/link";
import Image from "next/image";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { Mail, Phone, MapPin, ChevronRight } from "lucide-react";
import { useSiteConfig } from "@/lib/site";
import { CANONICAL_INSTAGRAM_URL, getSocialHref } from "@/lib/socialLinks";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { siteConfig } = useSiteConfig();
  const profile = siteConfig?.profile;

  const contactEmail = profile?.email || "hello@emberkidschess.com";
  const contactPhone = profile?.phone;
  const contactPhoneHref = profile?.phoneHref;
  const contactWhatsappHref = profile?.whatsappHref;
  const instagramHref = getSocialHref(siteConfig?.socialLinks, "instagram", CANONICAL_INSTAGRAM_URL);
  const hasPhone = Boolean(contactPhone && contactPhoneHref?.startsWith("tel:"));
  const hasWhatsapp = Boolean(contactWhatsappHref?.startsWith("https://"));
  const serviceArea = "Serving students across the US & Canada";

  return (
    <footer id="site-footer" className="bg-white text-[var(--color-muted)] border-t border-[var(--color-line)]" role="contentinfo">
      <div className="mx-auto max-w-7xl px-6 md:px-12 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3" aria-label="EmberKids Chess Academy Home">
              <Image
                src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288889/chess-academy/fav.png"
                alt="EmberKids Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
                sizes="(max-width: 768px) 40px, 40px"
              />
              <div>
                <span className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-[var(--color-walnut)] block">
                  Ember<span className="text-[#f85b1c]">Kids</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400 block">
                  Chess Academy
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-[var(--color-muted)]">
              Empowering young minds through strategic thinking and chess excellence. Join our community of future champions.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-[var(--color-walnut)] text-xs font-bold uppercase tracking-[0.2em] mb-6">
              Quick Links
            </h4>
            <nav aria-label="Footer Quick Links">
              <ul className="space-y-3 text-sm">
                {[
                  { name: "Academy",    href: "/about" },
                  { name: "Curriculum", href: "/courses" },
                  { name: "Prodigies",  href: "/prodigies" },
                  { name: "Contact",    href: "/contact" },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="hover:text-[var(--color-gold)] transition-colors inline-flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h4 className="text-[var(--color-walnut)] text-xs font-bold uppercase tracking-[0.2em] mb-6">
              Contact Us
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[var(--color-gold)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <a
                  href={`mailto:${contactEmail}`}
                  className="hover:text-[var(--color-gold)] transition-colors"
                  aria-label={`Send email to ${contactEmail}`}
                >
                  {contactEmail}
                </a>
              </li>
              {hasPhone && (
                <li className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[var(--color-gold)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <a href={contactPhoneHref} className="hover:text-[var(--color-gold)] transition-colors" aria-label={`Call ${contactPhone}`}>
                    {contactPhone}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[var(--color-gold)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <address className="text-[var(--color-muted)] not-italic">
                  {serviceArea}
                </address>
              </li>
            </ul>
          </div>

          {/* Column 4: Social */}
          <div>
            <h4 className="text-[var(--color-walnut)] text-xs font-bold uppercase tracking-[0.2em] mb-6">
              Follow Us
            </h4>

            <div className="flex flex-wrap gap-3" role="group" aria-label="Social media links">
              {/* Email */}
              <a
                href={`mailto:${contactEmail}`}
                className="h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--color-ivory)] border border-[var(--color-line)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all"
                aria-label="Send us an email"
              >
                <Mail className="h-5 w-5" aria-hidden="true" />
              </a>

              {/* Facebook */}
              <a
                href="#"
                className="h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--color-ivory)] border border-[var(--color-line)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all opacity-50 cursor-not-allowed"
                aria-label="Facebook (coming soon)"
              >
                <FaFacebookF className="h-5 w-5" aria-hidden="true" />
              </a>

              {/* WhatsApp */}
              {hasWhatsapp && (
                <a
                  href={contactWhatsappHref}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--color-ivory)] border border-[var(--color-line)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all"
                  aria-label="Contact us on WhatsApp"
                >
                  <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
                </a>
              )}

              {/* Instagram */}
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--color-ivory)] border border-[var(--color-line)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-all"
                aria-label="Follow us on Instagram"
              >
                <FaInstagram className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-8">
              <h4 className="text-[var(--color-walnut)] text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Legal
              </h4>
              <nav aria-label="Footer Legal Links">
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/privacy" className="hover:text-[var(--color-gold)] transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-[var(--color-gold)] transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--color-line)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted)]">
          <p>
            &copy; {currentYear} EmberKids Chess Academy. All rights reserved.
          </p>
          <p className="text-[var(--color-muted)]">
            Crafted with passion for chess excellence
          </p>
        </div>
      </div>
    </footer>
  );
}
