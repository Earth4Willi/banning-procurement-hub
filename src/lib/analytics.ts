export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export function track(event: string, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}