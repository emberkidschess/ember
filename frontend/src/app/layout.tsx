import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ErrorFallback from "@/components/ErrorFallback";
import { CANONICAL_INSTAGRAM_URL } from "@/lib/socialLinks";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// ─── SEO Metadata ──────────────────────────────────────────────────────────────

const SITE_URL = "https://emberkidschess.com";
const SITE_NAME = "EmberKids Chess Academy";
const SITE_DESCRIPTION =
  "Structured chess coaching for children built around focus, confidence, and competitive tournament thinking. Trusted by 5000+ students across 20+ countries.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Where Grandmasters Begin`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "chess academy for kids",
    "online chess coaching children",
    "chess classes for beginners",
    "tournament chess preparation",
    "chess for school students",
    "EmberKids chess",
    "chess prodigies India",
    "learn chess online",
    "kids chess program",
  ],
  authors: [{ name: "EmberKids Chess Academy", url: SITE_URL }],
  creator: "EmberKids",
  publisher: "EmberKids",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Where Grandmasters Begin`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288889/chess-academy/fav.png",
        width: 1200,
        height: 630,
        alt: "EmberKids Chess Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Where Grandmasters Begin`,
    description: SITE_DESCRIPTION,
    images: ["https://res.cloudinary.com/aaa97ofg/image/upload/v1783288889/chess-academy/fav.png"],
    creator: "@emberkids",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  category: "education",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1b16" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ─── JSON-LD Structured Data ───────────────────────────────────────────────────

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  logo: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288889/chess-academy/fav.png",
  telephone: "+91 88240 44647",
  email: "hello@emberkidschess.com",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  foundingDate: "2026",
  sameAs: [
    CANONICAL_INSTAGRAM_URL,
  ],
  offers: {
    "@type": "Offer",
    name: "Free Trial Chess Class",
    description: "Book a free 1-on-1 assessment session with our experienced coaches.",
    price: "0",
    priceCurrency: "USD",
  },
};

// ─── Root Layout ───────────────────────────────────────────────────────────────

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${dmSans.variable} scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-screen flex flex-col antialiased"
        style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
      >
        <ErrorBoundary fallback={<ErrorFallback />}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
