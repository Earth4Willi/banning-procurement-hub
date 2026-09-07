import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitViaWeb3Forms, web3FormsConfigured, web3FormsKey } from "./forms";

describe("Web3Forms helper", () => {
  const data = { name: "Nana", phone: "0551234567", email: "nana@banning.com", area: "Greater Accra", message: "Quote for cement" };

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reads the key from the environment", () => {
    expect(web3FormsKey()).toBe("test-key");
    expect(web3FormsConfigured()).toBe(true);
  });

  it("is unconfigured when the key is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_KEY", "");
    expect(web3FormsConfigured()).toBe(false);
  });

  it("skips and reports ok:false when unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_KEY", " ");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitViaWeb3Forms(data)).resolves.toEqual({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the payload and reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitViaWeb3Forms(data)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.web3forms.com/submit");
    const body = JSON.parse(init.body);
    expect(body.access_key).toBe("test-key");
    expect(body.name).toBe("Nana");
    expect(body.phone).toBe("0551234567");
    expect(body.email).toBe("nana@banning.com");
    expect(body.area).toBe("Greater Accra");
    expect(body.message).toBe("Quote for cement");
  });

  it("reports ok:false on a non-ok response and on thrown errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitViaWeb3Forms(data)).resolves.toEqual({ ok: false });

    const errorMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", errorMock);
    await expect(submitViaWeb3Forms(data)).resolves.toEqual({ ok: false });
  });
});