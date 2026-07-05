import Navbar from "@/components/layout/Navbar";
import FloatingDock from "@/components/layout/FloatingDock";
import Footer from "@/components/layout/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | EmberKids Chess Academy",
    default: "EmberKids Chess Academy — Where Grandmasters Begin",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex-1 flex flex-col">{children}</div>
      <FloatingDock />
      <Footer />
    </>
  );
}
