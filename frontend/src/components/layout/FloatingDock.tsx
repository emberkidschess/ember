"use client";

import { useEffect, useState } from "react";
import AcademyChatbot from "@/components/chat/AcademyChatbot";

export default function FloatingDock() {
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showLauncherMessage, setShowLauncherMessage] = useState(true);

  useEffect(() => {
    const updateDockVisibility = () => {
      const footer = document.getElementById("site-footer");
      if (!footer) return;
      setIsFooterVisible(footer.getBoundingClientRect().top < window.innerHeight - 10);
    };

    updateDockVisibility();
    window.addEventListener("scroll", updateDockVisibility, { passive: true });
    window.addEventListener("resize", updateDockVisibility);
    return () => {
      window.removeEventListener("scroll", updateDockVisibility);
      window.removeEventListener("resize", updateDockVisibility);
    };
  }, []);

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      setShowLauncherMessage(false);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setShowLauncherMessage(true), 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="fixed bottom-3.5 right-2 z-[100] sm:bottom-6 sm:right-6">
      <AcademyChatbot
        launcherVisible={!isFooterVisible}
        showLauncherMessage={showLauncherMessage && !isFooterVisible}
      />
    </div>
  );
}
