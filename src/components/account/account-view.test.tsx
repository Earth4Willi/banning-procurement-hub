import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { AccountView } from "./account-view";

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

function clickTab(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Tab not found: ${label}`);
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function postCalls(fn: ReturnType<typeof vi.fn>, url: string, method: string): unknown[][] {
  return fn.mock.calls.filter(
    ([input, init]) => String(input) === url && (init as RequestInit | undefined)?.method === method,
  );
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

const PROFILE = {
  role: "customer",
  email: "ama@example.com",
  name: "Ama Osei",
  phone: "0558850667",
  area: "Greater Accra",
  address: "East Legon, Accra",
};

const ORDERS = {
  orders: [
    {
      reference: "BPH-2401",
      status: "won",
      created_at: "2026-09-01T10:00:00Z",
      items: [{ slug: "ghacem", label: "Ghacem Super Cement", quantity: 2, unitPrice: 120 }],
      totals: { amount: 240, currency: "GHS" },
      payment_method: "mobile_money",
      doc_link: "/api/quote/abc123/document",
    },
    {
      reference: "BPH-2402",
      status: "new",
      created_at: "2026-09-05T09:00:00Z",
      items: [{ slug: "sand", label: "Sharp Sand", quantity: 1 }],
      totals: { amount: null, currency: "GHS" },
      payment_method: null,
      doc_link: null,
    },
  ],
};

const customerRoutes = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  "/api/auth/me": { status: 200, body: PROFILE },
  "GET /api/account/profile": { status: 200, body: PROFILE },
  "GET /api/account/orders": { status: 200, body: ORDERS },
  ...extra,
});

describe("AccountView", () => {
  it("renders Profile, Delivery, Security and My Orders tabs and prefills from /api/account/profile", async () => {
    const fetchMock = installFetch(customerRoutes());
    mount(<AccountView />);
    await flush();

    const text = container.textContent ?? "";
    expect(text).toContain("Profile");
    expect(text).toContain("Delivery");
    expect(text).toContain("Security");
    expect(text).toContain("My Orders");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/profile",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/orders",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect((container.querySelector('input[name="profile-name"]') as HTMLInputElement).value).toBe("Ama Osei");
  });

  it("shows an owner guard pointing to the dashboard when the session is an owner, without fetching account data", async () => {
    const fetchMock = installFetch({
      "/api/auth/me": { status: 200, body: { role: "owner", email: "owner@example.com" } },
    });
    mount(<AccountView />);
    await flush();

    expect(container.textContent).toContain("This area is for customers");
    expect(container.querySelector('a[href="/admin"]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("shows the sign-in prompt for a signed-out visitor without fetching account data", async () => {
    const fetchMock = installFetch({
      "/api/auth/me": { status: 401, body: { error: { code: "unauthenticated", message: "Not signed in." } } },
    });
    mount(<AccountView />);
    await flush();

    expect(container.textContent).toContain("Sign in to view your orders");
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders orders from /api/account/orders with items, totals, status and doc link", async () => {
    installFetch(customerRoutes());
    mount(<AccountView />);
    await flush();
    clickTab("My Orders");
    await flush();

    const text = container.textContent ?? "";
    expect(text).toContain("BPH-2401");
    expect(text).toContain("Ghacem Super Cement");
    expect(text).toContain("GH₵ 240.00");
    expect(text).toContain("won");
    expect(text).toContain("Mobile Money");
    expect(container.querySelector('a[href="/api/quote/abc123/document"]')).not.toBeNull();

    expect(text).toContain("BPH-2402");
    expect(text).toContain("Sharp Sand");
  });

  it("shows an empty state when the customer has no orders", async () => {
    installFetch(customerRoutes({ "GET /api/account/orders": { status: 200, body: { orders: [] } } }));
    mount(<AccountView />);
    await flush();
    clickTab("My Orders");
    await flush();

    expect(container.textContent).toContain("No orders yet.");
  });

  it("saves profile edits via PATCH and reflects success", async () => {
    const fetchMock = installFetch(
      customerRoutes({
        "PATCH /api/account/profile": {
          status: 200,
          body: { ok: true, user: { ...PROFILE, name: "Ama Osei Jnr" } },
        },
      }),
    );
    mount(<AccountView />);
    await flush();

    const name = container.querySelector('input[name="profile-name"]') as HTMLInputElement;
    setValue(name, "Ama Osei Jnr");
    await submit(name.closest("form") as HTMLFormElement);

    expect(postCalls(fetchMock, "/api/account/profile", "PATCH")).toHaveLength(1);
    const [, init] = postCalls(fetchMock, "/api/account/profile", "PATCH")[0] as [string, RequestInit];
    expect(init.body).toContain("Ama Osei Jnr");
    expect(container.textContent).toContain("Profile updated.");
  });

  it("surfaces the API error when a profile PATCH fails", async () => {
    installFetch(
      customerRoutes({
        "PATCH /api/account/profile": {
          status: 400,
          body: { error: { code: "email_taken", message: "An account already exists with those details." } },
        },
      }),
    );
    mount(<AccountView />);
    await flush();

    const email = container.querySelector('input[name="profile-email"]') as HTMLInputElement;
    setValue(email, "taken@example.com");
    await submit(email.closest("form") as HTMLFormElement);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("An account already exists");
  });

  it("blocks an invalid profile client-side without calling PATCH", async () => {
    const fetchMock = installFetch(customerRoutes());
    mount(<AccountView />);
    await flush();

    const name = container.querySelector('input[name="profile-name"]') as HTMLInputElement;
    setValue(name, "");
    await submit(name.closest("form") as HTMLFormElement);

    expect(postCalls(fetchMock, "/api/account/profile", "PATCH")).toHaveLength(0);
    expect(container.textContent).toContain("Please enter your name.");
  });

  it("changes the password via POST /api/account/password and confirms success", async () => {
    const fetchMock = installFetch(
      customerRoutes({
        "POST /api/account/password": { status: 200, body: { ok: true } },
      }),
    );
    mount(<AccountView />);
    await flush();
    clickTab("Security");
    await flush();

    setValue(container.querySelector('input[name="currentPassword"]') as HTMLInputElement, "OldPass123");
    setValue(container.querySelector('input[name="newPassword"]') as HTMLInputElement, "NewPass456");
    setValue(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, "NewPass456");
    const form = container.querySelector('input[name="currentPassword"]')?.closest("form") as HTMLFormElement;
    await submit(form);

    const calls = postCalls(fetchMock, "/api/account/password", "POST");
    expect(calls).toHaveLength(1);
    const [, init] = calls[0] as [string, RequestInit];
    expect(init.body).toContain('"currentPassword":"OldPass123"');
    expect(init.body).toContain('"newPassword":"NewPass456"');
    expect(container.textContent).toContain("Password updated.");
  });

  it("surfaces the API error when the current password is wrong", async () => {
    installFetch(
      customerRoutes({
        "POST /api/account/password": {
          status: 401,
          body: { error: { code: "invalid_credentials", message: "Current password is incorrect." } },
        },
      }),
    );
    mount(<AccountView />);
    await flush();
    clickTab("Security");
    await flush();

    setValue(container.querySelector('input[name="currentPassword"]') as HTMLInputElement, "WrongPass123");
    setValue(container.querySelector('input[name="newPassword"]') as HTMLInputElement, "NewPass456");
    setValue(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, "NewPass456");
    await submit(container.querySelector('input[name="currentPassword"]')?.closest("form") as HTMLFormElement);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Current password is incorrect.");
  });

  it("blocks a weak new password client-side without calling POST", async () => {
    const fetchMock = installFetch(customerRoutes());
    mount(<AccountView />);
    await flush();
    clickTab("Security");
    await flush();

    setValue(container.querySelector('input[name="currentPassword"]') as HTMLInputElement, "OldPass123");
    setValue(container.querySelector('input[name="newPassword"]') as HTMLInputElement, "abc");
    setValue(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, "abc");
    await submit(container.querySelector('input[name="currentPassword"]')?.closest("form") as HTMLFormElement);

    expect(postCalls(fetchMock, "/api/account/password", "POST")).toHaveLength(0);
    expect(container.textContent).toContain("include an uppercase letter");
  });
});