"use client";

import { useEffect, useState } from "react";
import { THEME_LABELS, resolveTheme, setTheme, type Theme } from "@/lib/theme";

const OPTIONS: Theme[] = ["dark", "light"];

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "dark" ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/**
 * Clubhouse / Sunlight scheme picker. Same storage as before
 * (og-golf-theme = "dark" | "light"), so existing choices carry over:
 * dark → Clubhouse, light → Sunlight.
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(resolveTheme());
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color scheme"
      data-control="theme-toggle"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-og-border bg-og-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            data-theme-option={option}
            onClick={() => choose(option)}
            className={`inline-flex h-9 sm:h-8 items-center gap-1 rounded-full px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-og-accent-line/60 ${
              active ? "bg-og-accent text-og-on-accent" : "text-og-accent-text hover:bg-og-raised"
            }`}
          >
            <span className="hidden sm:inline-flex">
              <ThemeIcon theme={option} />
            </span>
            {THEME_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
