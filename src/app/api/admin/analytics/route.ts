import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { computeAnalytics } from "@/server/analytics";
import { listSecurityEvents } from "@/server/audit";
import { listCustomers } from "@/server/customer-store";
import { isMessageStoreAvailable, listMessages } from "@/server/message-store";
import { listQuotes } from "@/server/quote-store";
import { requireOwner } from "@/server/require-owner";
import { withErrorHandling } from "@/server/with-error-handling";

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
  const [quotes, messages, customers, events] = await Promise.all([
    listQuotes(200),
    listMessages(200),
    listCustomers(),
    listSecurityEvents(50),
  ]);
  const analytics = computeAnalytics({
    quotes,
    messages,
    customersCount: customers.length,
    events,
  });
  return NextResponse.json({ analytics, dbAvailable: await isMessageStoreAvailable() });
});