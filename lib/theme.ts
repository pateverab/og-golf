export const THEME_STORAGE_KEY = "og-golf-theme";

/** Stored values stay "light" | "dark" so existing users keep their choice. */
export type Theme = "light" | "dark";

/** Display names: dark mode is now Clubhouse, light mode is now Sunlight. */
export const THEME_LABELS: Record<Theme, string> = {
  dark: "Clubhouse",
  light: "Sunlight",
};

/** Browser chrome color per scheme (meta theme-color can't read CSS variables). Matches --og-bg. */
export const THEME_CHROME_COLORS: Record<Theme, string> = {
  dark: "#06231a",
  light: "#faf7ee",
};

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_CHROME_COLORS[theme]));
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = resolveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}