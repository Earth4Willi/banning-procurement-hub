import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const messages: Record<string, unknown>[] = [];
const client = {
  from: (table: string) => ({
    insert: async (row: Record<string, unknown>) => {
      if (table === "messages") messages.push(row);
      return { error: null };
    },
    select: () => ({
      order: () => ({ limit: async () => ({ data: messages, error: null }) }),
    }),
    update: (patch: Record<string, unknown>) => ({
      eq: async () => ({ error: null, patch }),
    }),
  }),
} as unknown as SupabaseClient;

vi.mock("./audit", () => ({ getSupabaseClient: () => client }));

import { listMessages, persistMessage, setMessageRead, updateMessage } from "./message-store";

beforeEach(() => {
  messages.length = 0;
});

describe("persistMessage", () => {
  it("returns true and stores the row", async () => {
    const ok = await persistMessage({ name: "Ama", phone: "+233558850667", message: "hello", area: "Accra" });
    expect(ok).toBe(true);
    expect(messages).toHaveLength(1);
  });
});

describe("listMessages", () => {
  it("returns rows", async () => {
    await persistMessage({ name: "Ama", phone: "+233558850667", message: "hello" });
    const rows = await listMessages();
    expect(rows).toHaveLength(1);
  });
});

describe("setMessageRead / updateMessage", () => {
  it("resolve without error", async () => {
    expect(await setMessageRead("m1", true)).toBe(true);
    const ok = await updateMessage("m1", { message: "updated" });
    expect(ok).toBe(true);
  });
});