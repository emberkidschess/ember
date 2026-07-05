import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Let's Start Your Chess Journey",
  description:
    "Reach out to EmberKids Chess Academy. Book a free assessment, ask about curriculum, or talk to a coach directly via email, phone, or WhatsApp.",
  openGraph: {
    title: "Contact EmberKids Chess Academy",
    description: "Book a free trial class or reach us via email, phone, or WhatsApp.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
