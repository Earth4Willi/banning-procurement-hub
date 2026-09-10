import { z } from "zod";
import {
  deliverySettingsSchema,
  marqueeSettingsSchema,
  paymentSettingsSchema,
  siteSettingsSchema,
} from "@/lib/settings-types";
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
    deliveryAddress: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => (value === undefined || value === "" ? undefined : value)),
    intendedPaymentMethod: z
      .enum(["cash", "mobile_money", "bank", "other"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
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

export const manualQuoteSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
    area: z.string().trim().min(1).max(120),
    note: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  })
  .strict();

export const contactSubmitSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
    area: z.string().trim().min(1).max(120),
    message: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => (value === undefined || value === "" ? undefined : value)),
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

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => (value === undefined || value === "" ? undefined : value));

export const categorySchema = z
  .object({
    id: z.string().trim().min(1).max(60),
    name: z.string().trim().min(1).max(80),
    short: optionalText(40),
    description: optionalText(2000),
    imageUrl: optionalText(500),
    sortOrder: z.number().int().min(0).max(9999).default(0),
    visible: z.boolean().default(true),
  })
  .strict();

export const productSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug like 'ghacem-supacem-42-5'.")
      .min(1)
      .max(120),
    categoryId: z.string().trim().min(1).max(60),
    name: z.string().trim().min(1).max(120),
    brand: optionalText(80),
    unit: optionalText(30),
    unitPrice: optionalText(30),
    imageUrl: optionalText(500),
    description: optionalText(2000),
    stockQuantity: z.number().int().min(0).max(1000000).default(0),
    lowStockThreshold: z.number().int().min(0).max(1000000).default(10),
    trackInventory: z.boolean().default(true),
    pricingMode: z.enum(["fixed", "quote"]).default("quote"),
    kind: z.enum(["unit", "measure"]).default("unit"),
    visible: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .strict();

export const catalogItemIdSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
  })
  .strict();

export const messageUpdateSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    read: z.boolean().optional(),
    name: z.string().trim().min(1).max(80).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
    area: z.string().trim().min(1).max(120).optional(),
    message: optionalText(2000),
  })
  .strict();

export const customerUpdateSchema = z
  .object({
    phone: phoneSchema,
    notes: optionalText(2000),
    status: z.enum(["new", "active", "repeat", "inactive"]).optional(),
  })
  .strict();

export const quoteUpdateSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(80).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
    area: z.string().trim().min(1).max(120).optional(),
    note: optionalText(2000),
    status: z.enum(["new", "reviewed", "won", "lost"]).optional(),
    items: z
      .array(
        z.object({
          slug: z.string().trim().min(1).max(80),
          label: z.string().trim().min(1).max(120),
          quantity: z.number().int().min(1).max(9999),
          unitPrice: z.number().min(0).max(9_999_999).optional(),
        }).strict(),
      )
      .max(200)
      .optional(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
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

export const quotePaidSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    method: z.enum(["cash", "mobile_money", "bank", "other"]),
  })
  .strict();

export {
  siteSettingsSchema,
  marqueeSettingsSchema,
  paymentSettingsSchema,
  deliverySettingsSchema,
} from "@/lib/settings-types";

const strongPasswordSchema = z
  .string()
  .min(8)
  .max(200)
  .regex(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must be 8-200 characters and include an uppercase letter, a lowercase letter and a number.",
  );

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: emailSchema,
    phone: phoneSchema,
    password: strongPasswordSchema,
    area: optionalText(120),
    address: optionalText(500),
  })
  .strict();

export const customerLoginSchema = loginCredentialsSchema;

export const accountProfileSchema = z
  .object({
    name: optionalText(80),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    area: optionalText(120),
    address: optionalText(500),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: strongPasswordSchema,
  })
  .strict();

export const settingsUpdateSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("site"), value: siteSettingsSchema }).strict(),
  z.object({ key: z.literal("marquee"), value: marqueeSettingsSchema }).strict(),
  z.object({ key: z.literal("payments"), value: paymentSettingsSchema }).strict(),
  z.object({ key: z.literal("delivery"), value: deliverySettingsSchema }).strict(),
]);