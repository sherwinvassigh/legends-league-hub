"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  HiOutlineTrophy,
  HiOutlineUserGroup,
  HiOutlineCalendarDays,
  HiOutlineArrowsRightLeft,
  HiOutlineDocumentText,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineHome,
  HiOutlineBanknotes,
  HiChevronDown,
} from "react-icons/hi2";
import { useSeasonContext } from "@/components/SeasonProvider";

const navItems = [
  { href: "/", label: "Home", icon: HiOutlineHome },
  { href: "/standings", label: "Standings", icon: HiOutlineTrophy },
  { href: "/rosters", label: "Rosters", icon: HiOutlineUserGroup },
  { href: "/matchups", label: "Matchups", icon: HiOutlineCalendarDays },
  { href: "/transactions", label: "Activity", icon: HiOutlineArrowsRightLeft },
  { href: "/dues", label: "Dues", icon: HiOutlineBanknotes },
  { href: "/rules", label: "Rules", icon: HiOutlineDocumentText },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { seasons, currentSeason, setCurrentSeason, loading } =
    useSeasonContext();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setSeasonDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* Desktop top nav */}
      <nav
        className={`sticky top-0 z-50 hidden transition-all duration-300 md:block ${
          scrolled
            ? "border-b border-border/50 bg-white/70 shadow-sm backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logos/icon.JPG"
              alt="L.E.G.E.N.D.S."
              width={34}
              height={34}
              className="rounded-lg transition-transform group-hover:scale-105"
            />
            <span className="text-lg font-extrabold tracking-tight text-navy">
              L.E.G.E.N.D.S.
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.slice(1).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                    isActive
                      ? "text-navy"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-navy" />
                  )}
                </Link>
              );
            })}

            {/* Season selector */}
            {!loading && seasons.length > 1 && (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() =>
                    setSeasonDropdownOpen(!seasonDropdownOpen)
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-secondary transition-all hover:border-steel hover:text-navy"
                >
                  {currentSeason}
                  <HiChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      seasonDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {seasonDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                    {seasons.map((s) => (
                      <button
                        key={s.leagueId}
                        onClick={() => {
                          setCurrentSeason(s.season);
                          setSeasonDropdownOpen(false);
                          // Force page refresh to reload with new data
                          window.location.reload();
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                          s.season === currentSeason
                            ? "bg-navy/5 text-navy"
                            : "text-text-secondary hover:bg-surface"
                        }`}
                      >
                        <span>{s.season}</span>
                        {s.status === "pre_draft" && (
                          <span className="rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-600">
                            Pre-Draft
                          </span>
                        )}
                        {s.status === "in_season" && (
                          <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-medium text-emerald-600">
                            Active
                          </span>
                        )}
                        {s.status === "complete" && (
                          <span className="rounded bg-surface px-1 py-0.5 text-[9px] font-medium text-text-muted">
                            Complete
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav
        className={`sticky top-0 z-50 flex h-14 items-center justify-between px-4 transition-all duration-300 md:hidden ${
          scrolled
            ? "border-b border-border/50 bg-white/70 shadow-sm backdrop-blur-xl"
            : "bg-surface"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logos/icon.JPG"
            alt="L.E.G.E.N.D.S."
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-[15px] font-extrabold tracking-tight text-navy">
            L.E.G.E.N.D.S.
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Mobile season selector */}
          {!loading && seasons.length > 1 && (
            <select
              value={currentSeason}
              onChange={(e) => {
                setCurrentSeason(e.target.value);
                window.location.reload();
              }}
              className="rounded-lg border border-border bg-white px-2 py-1 text-[11px] font-bold text-text-secondary"
            >
              {seasons.map((s) => (
                <option key={s.leagueId} value={s.season}>
                  {s.season}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-white/60"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <HiOutlineXMark className="h-5 w-5" />
            ) : (
              <HiOutlineBars3 className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-40 bg-white/95 backdrop-blur-lg md:hidden">
          <div className="flex flex-col gap-1 p-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-semibold transition-all ${
                    isActive
                      ? "bg-navy text-white shadow-lg shadow-navy/20"
                      : "text-text-secondary hover:bg-surface"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-white/80 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around pb-[env(safe-area-inset-bottom)] pt-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5"
              >
                <div
                  className={`rounded-lg p-1 transition-colors ${
                    isActive ? "bg-navy/10" : ""
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? "text-navy" : "text-text-muted"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold transition-colors ${
                    isActive ? "text-navy" : "text-text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
