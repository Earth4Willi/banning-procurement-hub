import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { SettingsView } from "./settings-view";
import type { SettingsMap } from "@/lib/settings-types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Route = { status?: number; body: unknown };

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installFetch(routes: Record<string, Route>) {
  const fn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(_input);
    const method = (init?.method ?? "GET").toUpperCase();
    const route = routes[`${method} ${url}`] ?? routes[url];
    if (!route) return fakeResponse(500, { error: { message: `Unmocked: ${method} ${url}` } });
    return fakeResponse(route.status ?? 200, route.body);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

let container: HTMLDivElement;
let root: Root;

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(node);
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function setValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  act(() => {
    setter?.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

async function submit(form: HTMLFormElement) {
  act(() => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
}

function postCalls(fn: ReturnType<typeof vi.fn>, url: string, method: string): unknown[][] {
  return fn.mock.calls.filter(
    ([input, init]) => String(input) === url && (init as RequestInit | undefined)?.method === method,
  );
}

function clickButton(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === label || b.getAttribute("aria-label") === label,
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

const SESSION = { status: "signed-in", refresh: async () => {}, signOut: async () => {} } as const;

const SETTINGS: SettingsMap = {
  site: {
    name: "Banning Procurement Hub",
    tagline: "Your one-stop source for quality building materials across Ghana.",
    phoneDisplay: "055 885 0667",
    phoneIntl: "+233558850667",
    whatsappNumber: "233558850667",
    email: "banning173@gmail.com",
    address: "Office location shared on request. Serving all 16 regions of Ghana.",
    addressShort: "Accra, Ghana",
    hours: { summary: "Mon to Sat, 8am to 6pm", detail: "Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment." },
    mapEmbedUrl: "https://maps.google.com/maps?q=Accra",
    responsePromise: "Quotes within 24 hours",
    guarantee: "Quality-checked before delivery.",
  },
  marquee: { messages: ["Quotes within 24 hours", "Delivered across all 16 regions"] },
  payments: {
    methods: ["mobile_money", "bank", "cash"],
    bank: { bankName: "", accountName: "", accountNumber: "" },
  },
  delivery: { areas: ["Greater Accra", "Ashanti"] },
};

const routes = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  "/api/admin/settings": { status: 200, body: SETTINGS },
  ...extra,
});

describe("SettingsView", () => {
  it("loads settings and renders all four sections", async () => {
    const fetchMock = installFetch(routes());
    mount(<SettingsView session={SESSION} onNeedRefresh={() => {}} />);
    await flush();

    const text = container.textContent ?? "";
    expect(text).toContain("Site & contact");
    expect(text).toContain("Marquee");
    expect(text).toContain("Payments & bank");
    expect(text).toContain("Delivery");
    expect((container.querySelector('input[name="site-name"]') as HTMLInputElement).value).toBe(
      "Banning Procurement Hub",
    );
    expect((container.querySelector('input[name="site-tagline"]') as HTMLInputElement).value).toContain(
      "one-stop source",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/settings",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("saves site edits via PUT with the site key", async () => {
    const fetchMock = installFetch(routes({ "PUT /api/admin/settings": { status: 200, body: { ok: true } } }));
    mount(<SettingsView session={SESSION} onNeedRefresh={() => {}} />);
    await flush();

    const tagline = container.querySelector('input[name="site-tagline"]') as HTMLInputElement;
    setValue(tagline, "Quality materials, delivered.");
    await submit(tagline.closest("form") as HTMLFormElement);

    const calls = postCalls(fetchMock, "/api/admin/settings", "PUT");
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] as [string, RequestInit];
    expect(init.body).toContain('"key":"site"');
    expect(init.body).toContain("Quality materials, delivered.");
    expect(container.textContent).toContain("Site updated.");
  });

  it("adds, reorders and removes marquee messages then saves them", async () => {
    const fetchMock = installFetch(routes({ "PUT /api/admin/settings": { status: 200, body: { ok: true } } }));
    mount(<SettingsView session={SESSION} onNeedRefresh={() => {}} />);
    await flush();

    clickButton("Add message");
    const inputs = Array.from(container.querySelectorAll('input[name^="marquee-"]')) as HTMLInputElement[];
    expect(inputs.length).toBe(3);

    setValue(inputs[1], "We deliver on time");
    clickButton("Move down");

    const form = inputs[0].closest("form") as HTMLFormElement;
    await submit(form);

    const calls = postCalls(fetchMock, "/api/admin/settings", "PUT");
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] as [string, RequestInit];
    expect(init.body).toContain('"key":"marquee"');
    expect(container.textContent).toContain("Marquee updated.");
  });

  it("toggles payment methods and saves bank details", async () => {
    const fetchMock = installFetch(routes({ "PUT /api/admin/settings": { status: 200, body: { ok: true } } }));
    mount(<SettingsView session={SESSION} onNeedRefresh={() => {}} />);
    await flush();

    const cash = container.querySelector('input[name="payment-method-cash"]') as HTMLInputElement;
    expect(cash.checked).toBe(true);
    act(() => {
      cash.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    setValue(container.querySelector('input[name="payment-bankName"]') as HTMLInputElement, "GCB");
    setValue(container.querySelector('input[name="payment-accountNumber"]') as HTMLInputElement, "1234567890");
    await submit(cash.closest("form") as HTMLFormElement);

    const calls = postCalls(fetchMock, "/api/admin/settings", "PUT");
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] as [string, RequestInit];
    expect(init.body).toContain('"key":"payments"');
    expect(init.body).toContain('"bankName":"GCB"');
    expect(init.body).not.toContain('"cash"');
    expect(container.textContent).toContain("Payments updated.");
  });

  it("saves delivery areas from a newline list", async () => {
    const fetchMock = installFetch(routes({ "PUT /api/admin/settings": { status: 200, body: { ok: true } } }));
    mount(<SettingsView session={SESSION} onNeedRefresh={() => {}} />);
    await flush();

    const areas = container.querySelector('textarea[name="delivery-areas"]') as HTMLTextAreaElement;
    setValue(areas, "Accra\nKumasi\n");
    await submit(areas.closest("form") as HTMLFormElement);

    const calls = postCalls(fetchMock, "/api/admin/settings", "PUT");
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] as [string, RequestInit];
    expect(init.body).toContain('"key":"delivery"');
    expect(init.body).toContain('"areas":["Accra","Kumasi"]');
  });

  it("surfaces the API error when a save fails", async () => {
    installFetch(
      routes({
        "PUT /api/admin/settings": {
          status: 400,
          body: { error: { code: "validation", message: "Payment methods cannot be empty." } },
        },
      }),
    );
    mount(<SettingsView session={SESSION} onNeedRefresh={() => {}} />);
    await flush();

    const tagline = container.querySelector('input[name="site-tagline"]') as HTMLInputElement;
    await submit(tagline.closest("form") as HTMLFormElement);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Payment methods cannot be empty.",
    );
  });
});
