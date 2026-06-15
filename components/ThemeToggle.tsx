"use client";

import { useEffect, useState } from "react";
import { resolveTheme, setTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(resolveTheme());
  }, []);

  const isDark = theme === "dark";

  const toggle = () => {
    const next: Theme = isDark ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border border-golf-green-100 bg-golf-green-50 dark:border-[#2a5a48] dark:bg-[#153a2a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golf-gold/50"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform dark:bg-[#1f4a3a] ${
          isDark ? "translate-x-[22px]" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-golf-gold">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-golf-gold">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}