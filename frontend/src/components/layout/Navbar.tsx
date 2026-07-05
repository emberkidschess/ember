"use client";

import { ArrowUpRight, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteConfig } from "@/lib/site";
import JoinAcademyModal from "@/components/modals/JoinAcademyModal";
import BookFreeTrial from "@/components/modals/BookFreeTrial";
import { getCurrentStudent } from "@/lib/studentAuth";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false);
  const { siteConfig } = useSiteConfig();
  
  // Fallback data while loading or if config is not available
  const navigation = siteConfig?.navigation || [
    { name: "Home", href: "/" },
    { name: "Academy", href: "/about" },
    { name: "Curriculum", href: "/courses" },
    { name: "Prodigies", href: "/prodigies" },
    { name: "Contact", href: "/contact" },
  ];
  const primaryCta = siteConfig?.primaryCta || {
    label: "Book Free Trial",
    href: "/contact",
  };

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const checkStudentLogin = () => {
      setIsStudentLoggedIn(!!getCurrentStudent());
    };

    checkStudentLogin();

    // Listen for storage changes (in case student logs out from another tab)
    const handleStorageChange = () => {
      checkStudentLogin();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const isRouteActive = (href: string): boolean =>
    href === "/" ? pathname === "/" : (pathname?.startsWith(href) ?? false);

  const ScribbleUnderline = ({ isActive }: { isActive: boolean }) => (
    <svg
      className={`absolute -bottom-1 left-0 w-full h-3 overflow-visible pointer-events-none transition-all duration-700 ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`}
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
    >
      <path
        d="M0 8 Q 50 -2 100 8"
        stroke="#f85b1c"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        className={`draw-path ${isActive ? "path-active" : ""}`}
      />
    </svg>
  );

  return (
    <>
      {/* 1. SLIDING RAIL */}
      <div className="w-full bg-[#f85b1c] text-white overflow-hidden py-3 text-[0.6rem] uppercase tracking-[0.2em] z-[100] fixed top-0">
        <div className="flex animate-marquee whitespace-nowrap gap-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-10 items-center">
              <span>★ EmberKids: The Institution of Grandmasters</span>
              <span>★ Admissions for 2026 Batch Now Open</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. MAIN HEADER */}
      <header
        className={`
    fixed
    top-[32px]
    left-0
    w-full
    z-[95]
    py-4
    transition-all
    duration-500

    ${
      scrolled ? "bg-white/85 backdrop-blur-xl border-b border-black/5 shadow-sm" : "bg-transparent"
    }
  `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className={`
      flex items-center justify-center
      transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]

      ${scrolled ? "scale-90" : "scale-100"}
    `}
            >
              <Image
                src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288889/chess-academy/fav.png"
                alt="logo"
                width={40}
                height={40}
                className={`
        object-contain
        transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]

        ${scrolled ? "w-8 h-8" : "w-10 h-10"}
      `}
              />
            </div>

            <div
              className={`
      transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
      ${scrolled ? "translate-y-[1px]" : ""}
    `}
            >
              <h1
                className={`
        font-serif
        leading-none
       
        text-[#f85b1c]
        transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]

        ${scrolled ? "text-[22px]" : "text-[26px]"}
      `}
              >
                Ember<span className="text-black">Kids</span>
              </h1>

              <p
                className={`
        uppercase
        tracking-[0.25em]
        text-gray-500
        transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]

        ${scrolled ? "text-[0.52rem]" : "text-[0.65rem]"}
      `}
              >
                Chess Academy
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            {navigation.map((link) => {
              const isActive = isRouteActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`lg-nav-link relative group text-sm uppercase tracking-widest transition-colors py-2 ${isActive ? "text-[#f85b1c] active" : "text-gray-800"}`}
                >
                  {link.name}
                  <ScribbleUnderline isActive={isActive} />
                </Link>
              );
            })}
            {isStudentLoggedIn ? (
              <Link
                href="/student/dashboard"
                className="flex items-center gap-2 px-6 py-2 bg-black text-white hover:bg-black transition-colors text-sm uppercase tracking-widest cursor-pointer"
              >
                <User size={16} />
                Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="px-6 py-2 bg-black text-white hover:bg-black transition-colors text-sm uppercase tracking-widest cursor-pointer"
              >
                Join Academy
              </button>
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
            {isStudentLoggedIn ? (
              <Link
                href="/student/dashboard"
                className="flex items-center justify-center w-9 h-9 rounded-full border text-black cursor-pointer"
                aria-label="Dashboard"
              >
                <User size={18} />
              </Link>
            ) : (
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="px-3 py-2 sm:px-4 bg-black text-white text-[10px] sm:text-xs uppercase tracking-widest cursor-pointer"
              >
                Join
              </button>
            )}
            <button
              className="cursor-pointer p-2"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu
                size={28}
                strokeWidth={3}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 bg-white z-[120] lg:hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
      >
        <div className="absolute right-[-30px] bottom-[-60px] text-[220px] font-serif text-black/[0.03] select-none pointer-events-none">
          ♔
        </div>

        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-5 sm:py-6 flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Image
                  src="https://res.cloudinary.com/aaa97ofg/image/upload/v1783288889/chess-academy/fav.png"
                  alt="logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h2 className="font-serif text-2xl text-[#f85b1c]">
                  Ember<span className="text-black">Kids</span>
                </h2>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">
                  Chess Academy
                </p>
              </div>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close navigation menu"
            >
              <X size={28} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div
          className={`h-[calc(100dvh-90px)] flex flex-col justify-between overflow-y-auto px-5 py-6 sm:px-6 sm:py-8 transition-all duration-700 delay-150 ${isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <nav className="flex flex-col">
            {navigation.map((link) => {
              const isActive = isRouteActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group flex items-center justify-between py-5 border-b border-gray-100"
                >
                  <span
                    className={`font-serif text-2xl sm:text-3xl transition-all duration-300 group-hover:text-[#f85b1c] group-hover:translate-x-2 ${isActive ? "text-[#f85b1c]" : "text-black"}`}
                  >
                    {link.name}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                  />
                </Link>
              );
            })}
          </nav>

          <div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsJoinModalOpen(true);
              }}
              className="w-full text-center text-sm uppercase tracking-[0.2em] text-gray-500 hover:text-[#f85b1c] transition-colors mb-4 cursor-pointer"
            >
              How does joining work?
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsTrialModalOpen(true);
              }}
              className="group relative overflow-hidden flex items-center justify-center w-full rounded-full border border-black py-4 cursor-pointer"
            >
              <span className="relative z-10 text-sm uppercase tracking-[0.2em] transition-colors duration-500 group-hover:text-white">
                {primaryCta.label}
              </span>
              <div className="absolute inset-0 bg-[#f85b1c] scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100" />
            </button>
            <p className="mt-8 text-center font-serif italic text-gray-400">
              “Every grandmaster was once a beginner.”
            </p>
          </div>
        </div>
      </div>

      <JoinAcademyModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onStartTrial={() => setIsTrialModalOpen(true)}
      />
      <BookFreeTrial isOpen={isTrialModalOpen} onClose={() => setIsTrialModalOpen(false)} />
    </>
  );
}
