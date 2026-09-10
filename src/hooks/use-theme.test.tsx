import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { useTheme } from "./use-theme";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = "bph-theme";
const originalMatchMedia = window.matchMedia;

type Theme = "light" | "dark";

let container: HTMLDivElement;
let root: Root;

function mount(onEach?: (theme: Theme) => void) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let latest: { theme: Theme; toggle: () => void } | undefined;
  function Probe() {
    latest = useTheme();
    onEach?.(latest.theme);
    return null;
  }
  act(() => {
    root.render(React.createElement(Probe));
  });
  return {
    get theme() {
      return latest?.theme as Theme;
    },
    toggle: () => act(() => latest?.toggle()),
    unmount: () => act(() => root.unmount()),
  };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  Object.defineProperty(window, "matchMedia", { value: originalMatchMedia });
});

describe("useTheme", () => {
  it("renders the server default (light) on first client render even when dark is persisted, so SSR and hydration agree", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    let firstRender: Theme | undefined;
    mount((theme) => {
      if (firstRender === undefined) firstRender = theme;
    });
    expect(firstRender).toBe("light");
  });

  it("applies a persisted dark theme only after mount", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    const seen: Theme[] = [];
    const h = mount((t) => seen.push(t));
    expect(h.theme).toBe("dark");
    expect(seen[0]).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("dark");
    h.unmount();
  });

  it("falls back to the OS theme when nothing is persisted, matching the head bootstrap script", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    const h = mount();
    expect(h.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    h.unmount();
  });

  it("toggles between light and dark and persists the choice", () => {
    const seen: Theme[] = [];
    const h = mount((t) => seen.push(t));
    expect(h.theme).toBe("light");
    h.toggle();
    expect(h.theme).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    h.toggle();
    expect(h.theme).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });
});