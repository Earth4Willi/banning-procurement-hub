"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site";

type SettingsResponse = { delivery?: { areas?: string[] } };

/**
 * Delivery areas are editable in admin Settings → Delivery, stored in the
 * `site_settings` table, and served by GET /api/settings. Read them once on
 * mount so admin forms (quote editor, manual quote form) always offer the
 * admin-curated list, falling back to the static config when the fetch fails
 * or nothing has been saved yet.
 */
export function useDeliveryAreas(): string[] {
  const [areas, setAreas] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { credentials: "same-origin" })
      .then((res) => (res.ok ? (res.json() as Promise<SettingsResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        const raw = data?.delivery?.areas;
        const clean = Array.isArray(raw) ? raw.map((area) => area.trim()).filter(Boolean) : [];
        if (clean.length > 0) setAreas(clean);
      })
      .catch(() => {
        /* keep static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return areas && areas.length > 0 ? areas : siteConfig.deliveryAreas;
}