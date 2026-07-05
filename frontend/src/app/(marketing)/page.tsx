"use client";

import { useState } from "react";
import Hero from "@/components/sections/Hero";
import Cta from "@/components/sections/Cta";
import HomeSections from "@/components/sections/HomeSections";
import BookFreeTrial from "@/components/modals/BookFreeTrial";

export default function Page() {
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);

  return (
    <div>
      <Hero onOpenTrial={() => setIsTrialModalOpen(true)} />
      <HomeSections />

      <Cta
        title="Ready to make your first move?"
        description="Book a guided assessment and see how EmberKids can shape focus, confidence, and competitive thinking."
        buttonText="Book Free Trial"
        buttonHref="/contact"
        className="pb-20"
      />
      <BookFreeTrial isOpen={isTrialModalOpen} onClose={() => setIsTrialModalOpen(false)} />
    </div>
  );
}
