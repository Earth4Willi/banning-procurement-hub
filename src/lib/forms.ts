export type Web3FormData = {
  name: string;
  phone: string;
  email?: string;
  area: string;
  message?: string;
  subject?: string;
};

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export function web3FormsKey(): string {
  return process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "";
}

export function web3FormsConfigured(): boolean {
  return web3FormsKey().trim().length > 0;
}

export type SubmitResult = { ok: boolean; skipped?: boolean };

export async function submitViaWeb3Forms(data: Web3FormData): Promise<SubmitResult> {
  const accessKey = web3FormsKey();
  if (!accessKey.trim()) return { ok: false, skipped: true };
  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: data.subject ?? "New enquiry — Banning Procurement Hub",
        from_name: data.name,
        name: data.name,
        phone: data.phone,
        email: data.email ?? "",
        area: data.area,
        message: data.message ?? "",
        botcheck: "",
      }),
    });
    if (!response.ok) return { ok: false };
    const payload = await response.json().catch(() => null);
    return { ok: Boolean(payload?.success) };
  } catch {
    return { ok: false };
  }
}