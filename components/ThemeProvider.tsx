"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme, getSystemTheme, resolveTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(resolveTheme());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!getStoredTheme()) {
        applyTheme(getSystemTheme());
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return children;
}