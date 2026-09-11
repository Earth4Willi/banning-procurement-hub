import { z } from "zod";
import { siteConfig } from "./site";

export type SettingsKey = "site" | "marquee" | "payments" | "delivery";

export type SiteSettingsContent = {
  name: string;
  tagline: string;
  phoneDisplay: string;
  phoneIntl: string;
  whatsappNumber: string;
  email: string;
  address: string;
  addressShort: string;
  hours: { summary: string; detail: string };
  mapEmbedUrl: string;
  responsePromise: string;
  guarantee: string;
};

export type MarqueeItem = string;

export type MarqueeSettings = { messages: MarqueeItem[] };

export type BankDetails = { bankName: string; accountName: string; accountNumber: string };

export type PaymentSettings = { methods: string[]; bank: BankDetails };

export type DeliverySettings = { areas: string[] };

export type SettingsMap = {
  site: SiteSettingsContent;
  marquee: MarqueeSettings;
  payments: PaymentSettings;
  delivery: DeliverySettings;
};

export const siteSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    tagline: z.string().trim().max(200),
    phoneDisplay: z.string().trim().max(30),
    phoneIntl: z.string().trim().max(30),
    whatsappNumber: z.string().trim().max(30),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    address: z.string().trim().max(300),
    addressShort: z.string().trim().max(120),
    hours: z
      .object({
        summary: z.string().trim().max(60),
        detail: z.string().trim().max(240),
      })
      .strict(),
    mapEmbedUrl: z.string().trim().max(1000),
    responsePromise: z.string().trim().max(80),
    guarantee: z.string().trim().max(300),
  })
  .strict();

export const marqueeSettingsSchema = z
  .object({
    messages: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
  })
  .strict();

export const paymentSettingsSchema = z
  .object({
    methods: z.array(z.enum(["mobile_money", "bank", "cash", "other"])).min(1),
    bank: z
      .object({
        bankName: z.string().trim().max(120),
        accountName: z.string().trim().max(120),
        accountNumber: z.string().trim().max(60),
      })
      .strict(),
  })
  .strict()
  .superRefine((settings, ctx) => {
    if (settings.methods.includes("bank")) {
      for (const field of ["bankName", "accountName", "accountNumber"] as const) {
        if (!settings.bank[field].trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["bank", field],
            message: "Required when Bank transfer is enabled.",
          });
        }
      }
    }
  });

export const deliverySettingsSchema = z
  .object({
    areas: z.array(z.string().trim().min(1).max(120)).min(1).max(40),
  })
  .strict();

/**
 * Seed values mirror `supabase/migrations/0004_phase3.sql` verbatim. `site`
 * and `delivery` reference `site.ts` directly so the three stay in sync;
 * `marquee` and `payments` carry the migration's exact strings.
 */
export const SEED_SETTINGS: SettingsMap = {
  site: {
    name: siteConfig.name,
    tagline: siteConfig.tagline,
    phoneDisplay: siteConfig.phoneDisplay,
    phoneIntl: siteConfig.phoneIntl,
    whatsappNumber: siteConfig.whatsappNumber,
    email: siteConfig.email,
    address: siteConfig.address,
    addressShort: siteConfig.addressShort,
    hours: {
      summary: siteConfig.hours.summary,
      detail: siteConfig.hours.detail,
    },
    mapEmbedUrl: siteConfig.mapEmbedUrl,
    responsePromise: siteConfig.responsePromise,
    guarantee: siteConfig.guarantee,
  },
  marquee: {
    messages: ["Quotes within 24 hours", "Delivered across all 16 regions"],
  },
  payments: {
    methods: ["mobile_money", "bank", "cash"],
    bank: { bankName: "", accountName: "", accountNumber: "" },
  },
  delivery: {
    areas: [...siteConfig.deliveryAreas],
  },
};

export const SETTINGS_SCHEMAS: { [K in SettingsKey]: z.ZodType<SettingsMap[K]> } = {
  site: siteSettingsSchema,
  marquee: marqueeSettingsSchema,
  payments: paymentSettingsSchema,
  delivery: deliverySettingsSchema,
};