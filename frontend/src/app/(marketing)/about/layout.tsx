import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Our Academy — The Art of Strategic Thought",
  description:
    "Discover the philosophy, curriculum, and coaching expertise behind EmberKids Chess Academy. 5000+ students trained across 20+ countries.",
  openGraph: {
    title: "About EmberKids Chess Academy",
    description: "The Art of Strategic Thought — our philosophy, coaches, and transformative approach to chess education.",
    images: [{ url: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288731/chess-academy/academychild.png", alt: "EmberKids Academy students" }],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
