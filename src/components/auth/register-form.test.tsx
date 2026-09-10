import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { RegisterForm } from "./register-form";

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

async function fillValid() {
  setValue(container.querySelector('input[name="name"]') as HTMLInputElement, "Ama Osei");
  setValue(container.querySelector('input[name="phone"]') as HTMLInputElement, "0558850667");
  setValue(container.querySelector('input[name="email"]') as HTMLInputElement, "ama@example.com");
  setValue(container.querySelector('select[name="area"]') as HTMLSelectElement, "Greater Accra");
  setValue(container.querySelector('input[name="address"]') as HTMLInputElement, "East Legon, Accra");
  setValue(container.querySelector('input[name="password"]') as HTMLInputElement, "Secret123");
  setValue(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, "Secret123");
}

describe("RegisterForm", () => {
  it("submits valid details to /api/auth/register and redirects to /account", async () => {
    const fetchMock = installFetch({
      "POST /api/auth/register": {
        status: 201,
        body: { ok: true, user: { id: "u1", email: "ama@example.com", name: "Ama Osei", phone: "+233558850667" } },
      },
    });
    mount(<RegisterForm />);
    await fillValid();
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Ama Osei"'),
      }),
    );
    expect(push).toHaveBeenCalledWith("/account");
  });

  it("surfaces a duplicate-account error from the API", async () => {
    installFetch({
      "POST /api/auth/register": {
        status: 400,
        body: { error: { code: "email_taken", message: "An account already exists with those details." } },
      },
    });
    mount(<RegisterForm />);
    await fillValid();
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("An account already exists");
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks a weak password client-side before calling the API", async () => {
    const fetchMock = installFetch({});
    mount(<RegisterForm />);
    await fillValid();
    setValue(container.querySelector('input[name="password"]') as HTMLInputElement, "abc123");
    setValue(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, "abc123");
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("include an uppercase letter");
  });

  it("blocks mismatched password confirmation before calling the API", async () => {
    const fetchMock = installFetch({});
    mount(<RegisterForm />);
    await fillValid();
    setValue(container.querySelector('input[name="confirmPassword"]') as HTMLInputElement, "Secret124");
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Passwords do not match.");
  });

  it("blocks an invalid phone client-side before calling the API", async () => {
    const fetchMock = installFetch({});
    mount(<RegisterForm />);
    await fillValid();
    setValue(container.querySelector('input[name="phone"]') as HTMLInputElement, "123");
    await submit(container.querySelector("form") as HTMLFormElement);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Enter a valid Ghana mobile number");
  });
});