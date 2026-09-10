import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPublicSiteSettings } from "@/server/settings-store";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_LABELS: Record<string, string> = {
  mobile_money: "Mobile Money",
  bank: "Bank Transfer",
  cash: "Cash",
};

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const { site, marquee, delivery, payments } = await getPublicSiteSettings();
  return NextResponse.json({
    site: {
      responsePromise: site.responsePromise,
      phoneIntl: site.phoneIntl,
      whatsappNumber: site.whatsappNumber,
      email: site.email,
      addressShort: site.addressShort,
      hours: site.hours,
    },
    marquee: { messages: marquee.messages },
    delivery: { areas: delivery.areas },
    payments: {
      methods: payments.methods.map((key) => ({ key, label: PAYMENT_LABELS[key] ?? key })),
    },
  });
});