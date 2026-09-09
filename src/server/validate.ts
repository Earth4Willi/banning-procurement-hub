import { z } from "zod";
import { badRequest } from "./http-error";

export const BODY_LIMIT_BYTES = 16 * 1024;

const GHANA_MOBILE = /^(?:\+?233|0)?\s?[245][0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  const compact = value.replace(/\s+/g, "");
  return /^0[245]/.test(compact) ? `+233${compact.slice(1)}` : compact;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(20)
  .regex(GHANA_MOBILE, "Enter a valid Ghana mobile number.")
  .transform(normalizePhone);

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .transform(normalizeEmail);

export const quoteSubmitSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
    area: z.string().trim().min(1).max(120),
    note: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
    items: z
      .array(
        z.object({
          slug: z.string().trim().min(1).max(80),
          label: z.string().trim().min(1).max(120),
          quantity: z.number().int().min(1).max(9999),
        }),
      )
      .min(1)
      .max(200),
  })
  .strict();

export const contactSubmitSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
    area: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const loginCredentialsSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(200),
  })
  .strict();

export const adminQuoteStatusSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    status: z.enum(["new", "reviewed", "won", "lost"]),
  })
  .strict();

export const verifyLoginSchema = z
  .object({
    pendingId: z.string().trim().min(1).max(128),
    totpCode: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  })
  .strict();

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    throw badRequest("invalid_encoding", "Request body could not be read.");
  }
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) {
    throw badRequest("payload_too_large", "Request body is too large.");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw badRequest("invalid_json", "Expected a JSON body.");
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw badRequest(
      "validation_failed",
      "One or more fields are invalid.",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}