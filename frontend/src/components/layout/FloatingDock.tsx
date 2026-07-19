"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { AnimatePresence, motion } from "framer-motion";
import AcademyChatbot from "@/components/chat/AcademyChatbot";
import { useSiteConfig } from "@/lib/site";

export default function FloatingDock() {
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showWhatsappTooltip, setShowWhatsappTooltip] = useState(true);
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
      setShowWhatsappTooltip(false);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setShowWhatsappTooltip(true), 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="fixed bottom-3.5 right-2 z-[100] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
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
            className="relative"
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

              <AnimatePresence>
                {showWhatsappTooltip && (
                  <motion.span
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: [-3, 3, -3, 3, -3] }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{
                      opacity: { type: "spring", stiffness: 300, damping: 20 },
                      rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#25D366] bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-lg sm:px-4 sm:py-2 sm:text-sm"
                  >
                    hello 👋🏻
                  </motion.span>
                )}
              </AnimatePresence>

              <FaWhatsapp className="relative z-10 text-2xl" aria-hidden="true" />
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

      <AcademyChatbot launcherVisible={!isFooterVisible} />
    </div>
  );
}
