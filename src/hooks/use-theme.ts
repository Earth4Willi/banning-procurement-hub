"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "bph-theme";

function resolvedTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  // Light is the server default and the initial hydration render. Reading
  // localStorage here would make the first client render diverge from the
  // server (hydration mismatch), so the real theme is resolved only after
  // mount — matching the <head> bootstrap script in the root layout.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(resolvedTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage disabled — theme still applies for this session */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return { theme, toggle };
}