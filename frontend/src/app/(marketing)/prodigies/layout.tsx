import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prodigies — Our Hall of Fame",
  description:
    "Meet EmberKids' finest young chess minds. Students who transformed their focus into state championships, national qualifiers, and competitive ratings.",
  openGraph: {
    title: "EmberKids Prodigies — Our Hall of Fame",
    description: "Meet our rising champions — students who turned dedication into titles.",
    images: [{ url: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288888/chess-academy/bala.jpg", alt: "EmberKids student champion" }],
  },
};

export default function ProdigiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
