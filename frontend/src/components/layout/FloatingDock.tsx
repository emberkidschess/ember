"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { AnimatePresence, motion } from "framer-motion";
import AcademyChatbot from "@/components/chat/AcademyChatbot";
import { useSiteConfig } from "@/lib/site";

export default function FloatingDock() {
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showChatbotTooltip, setShowChatbotTooltip] = useState(true);
  const { siteConfig } = useSiteConfig();
  const whatsappHref = siteConfig?.profile?.whatsappHref || "https://wa.me/919876543210";

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
      setShowChatbotTooltip(false);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setShowChatbotTooltip(true), 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3.5 z-[100] flex flex-row items-end justify-between px-4 sm:bottom-6 sm:px-6">
      <style jsx>{`
        @keyframes whatsappWave {
          0% {
            transform: scale(1);
            opacity: 0.35;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        .whatsapp-wave {
          animation: whatsappWave 3s linear infinite;
        }
      `}</style>

      <AnimatePresence>
        {!isFooterVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ type: "spring", stiffness: 250, damping: 25 }}
            className="pointer-events-auto relative order-2"
          >
            <motion.a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label="Chat on WhatsApp"
              className="relative flex h-14 w-14 cursor-pointer select-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.3)]"
              whileHover={{
                scale: 1.08,
                transition: { type: "spring", stiffness: 400, damping: 15 },
              }}
              whileTap={{ scale: 0.94 }}
            >
              <span
                aria-hidden="true"
                className="whatsapp-wave pointer-events-none absolute inset-0 rounded-full bg-[#25D366]"
              />

              <FaWhatsapp className="relative z-10 text-2xl" aria-hidden="true" />
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto order-1">
        <AcademyChatbot
          launcherVisible={!isFooterVisible}
          showLauncherMessage={showChatbotTooltip && !isFooterVisible}
        />
      </div>
    </div>
  );
}
