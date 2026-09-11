"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsPageview() {
  const pathname = usePathname();

  useEffect(() => {
    window.gtag?.("event", "page_view", {
      page_location: pathname,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}