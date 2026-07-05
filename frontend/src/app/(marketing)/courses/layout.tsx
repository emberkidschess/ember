import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curriculum — Four Levels, One Destination",
  description:
    "Explore EmberKids' structured chess curriculum: from beginner Logic Core to Elite Grandmaster Prep. Tournament-ready.",
  openGraph: {
    title: "EmberKids Chess Curriculum",
    description: "Four levels. One goal: tournament-ready young thinkers.",
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
