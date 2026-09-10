import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getSettings, updateSettings } from "@/server/settings-store";
import { requireOwner } from "@/server/require-owner";
import { parseBody, settingsUpdateSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";
import { revalidatePublic } from "@/server/revalidate";
import type { SettingsKey } from "@/lib/settings-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") as SettingsKey | null;

  if (key && ["site", "marquee", "payments", "delivery"].includes(key)) {
    const value = await getSettings(key);
    return NextResponse.json({ [key]: value });
  }

  const [site, marquee, payments, delivery] = await Promise.all([
    getSettings("site"),
    getSettings("marquee"),
    getSettings("payments"),
    getSettings("delivery"),
  ]);
  return NextResponse.json({ site, marquee, payments, delivery });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  const body = await parseBody(request, settingsUpdateSchema);
  const ok = await updateSettings(body.key, body.value);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — settings not updated." } },
      { status: 503 },
    );
  }
  await audit("settings_updated", { key: body.key });
  revalidatePublic();
  return NextResponse.json({ ok: true });
});
