"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-muted transition-transform hover:text-ink active:scale-[0.97]"
    >
      {theme === "light" ? <Moon weight="duotone" size={20} /> : <Sun weight="duotone" size={20} />}
    </button>
  );
}
