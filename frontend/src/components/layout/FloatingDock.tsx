"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { useSiteConfig } from "@/lib/site";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingDock() {
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const { siteConfig } = useSiteConfig();
  const profile = siteConfig?.profile;

  useEffect(() => {
    const updateDockVisibility = () => {
      const footer = document.getElementById("site-footer");
      if (!footer) return;

      const footerTop = footer.getBoundingClientRect().top;
      setIsFooterVisible(footerTop < window.innerHeight - 10);
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
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setShowTooltip(false);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isFooterVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <style jsx>{`
            @keyframes smoothWave {
              0% {
                transform: scale(1);
                opacity: 0.4;
              }
              100% {
                transform: scale(1.6);
                opacity: 0;
              }
            }
            @keyframes smoothGlow {
              0%,
              100% {
                transform: scale(0.95);
                opacity: 0.2;
              }
              50% {
                transform: scale(1.15);
                opacity: 0.4;
              }
            }
            .wave-1 {
              animation: smoothWave 3s linear infinite;
            }
            .wave-2 {
              animation: smoothWave 3s linear infinite;
              animation-delay: 1.5s;
            }
            .ambient-glow {
              animation: smoothGlow 4s ease-in-out infinite;
            }
          `}</style>

          <motion.a
            href={profile?.whatsappHref || "https://wa.me/919876543210"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="
              relative flex h-14 w-14 items-center justify-center
              rounded-full bg-[#25D366] text-white
              shadow-[0_8px_24px_rgba(37,211,102,0.3)]
              cursor-pointer select-none
            "
            whileHover={{
              scale: 1.08,
              transition: { type: "spring", stiffness: 400, damping: 15 },
            }}
            whileTap={{ scale: 0.94 }}
          >
            <div className="wave-2 absolute inset-0 rounded-full bg-[#25D366] pointer-events-none" />

            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: [-3, 3, -3, 3, -3] }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ 
                    opacity: { type: "spring", stiffness: 300, damping: 20 },
                    rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
                >
                  <div className="relative bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border-2 border-[#25D366]">
                    <span className="text-xs sm:text-sm font-medium text-gray-800">
                      hello 👋🏻
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <FaWhatsapp className="text-2xl" />
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
