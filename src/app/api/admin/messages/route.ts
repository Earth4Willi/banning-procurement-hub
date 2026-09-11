import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { badRequest } from "@/server/http-error";
import { audit } from "@/server/audit";
import { deleteMessage, isMessageStoreAvailable, listMessages, setMessageRead, updateMessage } from "@/server/message-store";
import { verifySameOrigin } from "@/server/csrf";
import { requireStaff } from "@/server/require-staff";
import { catalogItemIdSchema, messageUpdateSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(request: NextRequest) {
  const principal = await requireStaff(request, ["messages"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  return null;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const messages = await listMessages(200);
  return NextResponse.json({ messages, dbAvailable: await isMessageStoreAvailable() });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, messageUpdateSchema);
  const patchCount = Object.keys(body).length - 1;
  if (patchCount === 0) {
    throw badRequest("validation_failed", "Provide at least one field to update.");
  }
  let ok = true;
  if (body.read !== undefined) {
    ok = (await setMessageRead(body.id, body.read)) && ok;
  }
  if (body.name !== undefined || body.phone !== undefined || body.email !== undefined || body.area !== undefined || body.message !== undefined) {
    ok = (await updateMessage(body.id, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      area: body.area,
      message: body.message,
    })) && ok;
  }
  if (!ok) {
    const configured = await isMessageStoreAvailable();
    return NextResponse.json(
      {
        error: {
          code: "storage_unavailable",
          message: configured
            ? "The message could not be updated — check the server logs for details."
            : "Live database not configured — message not updated.",
        },
      },
      { status: 503 },
    );
  }
  await audit("message_updated", { id: body.id, read: body.read });
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, catalogItemIdSchema);
  const ok = await deleteMessage(body.id);
  if (!ok) {
    const configured = await isMessageStoreAvailable();
    return NextResponse.json(
      {
        error: {
          code: "storage_unavailable",
          message: configured
            ? "The message could not be deleted — check the server logs for details."
            : "Live database not configured — message not deleted.",
        },
      },
      { status: 503 },
    );
  }
  await audit("message_deleted", { id: body.id });
  return NextResponse.json({ ok: true });
});