"use client";

import { useState } from "react";
import { ArrowUp } from "@phosphor-icons/react";
import { useScroll, useMotionValueEvent } from "motion/react";

export function ScrollTop() {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 400);
  });

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 left-6 z-50 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-alt text-ink-muted shadow-md transition-transform hover:scale-105 active:scale-95"
    >
      <ArrowUp weight="duotone" size={20} />
    </button>
  );
}
