import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoginForm } from "./login-form";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

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

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("LoginForm", () => {
  it("submits email + password to /api/auth/customer/login and redirects to /account", async () => {
    const fetchMock = installFetch({
      "POST /api/auth/customer/login": { status: 200, body: { ok: true } },
    });
    mount(<LoginForm />);
    const email = container.querySelector('input[name="email"]') as HTMLInputElement;
    const password = container.querySelector('input[name="password"]') as HTMLInputElement;
    setValue(email, "ama@example.com");
    setValue(password, "Secret123");
    await submit(email.closest("form") as HTMLFormElement);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/customer/login",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"email":"ama@example.com"'),
      }),
    );
    expect(push).toHaveBeenCalledWith("/account");
  });

  it("surfaces the generic API error when credentials are wrong", async () => {
    installFetch({
      "POST /api/auth/customer/login": {
        status: 401,
        body: { error: { code: "invalid_credentials", message: "Invalid email or password." } },
      },
    });
    mount(<LoginForm />);
    setValue(container.querySelector('input[name="email"]') as HTMLInputElement, "ama@example.com");
    setValue(container.querySelector('input[name="password"]') as HTMLInputElement, "wrong-password");
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Invalid email or password.");
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks empty or invalid fields client-side without calling the API", async () => {
    const fetchMock = installFetch({});
    mount(<LoginForm />);
    setValue(container.querySelector('input[name="email"]') as HTMLInputElement, "not-an-email");
    setValue(container.querySelector('input[name="password"]') as HTMLInputElement, "");
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Enter a valid email address.");
    expect(container.textContent).toContain("Please enter your password.");
  });
});