import { getSupabaseClient } from "./audit";

export type MessageInput = {
  name: string;
  phone: string;
  email?: string;
  area?: string;
  message: string;
};

export type { MessageRecord } from "@/lib/catalog-types";

export async function isMessageStoreAvailable(): Promise<boolean> {
  return getSupabaseClient() !== null;
}

export async function persistMessage(input: MessageInput): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("messages").insert({
      name: input.name,
      phone: input.phone,
      email: input.email ?? "",
      area: input.area ?? "",
      message: input.message,
    });
    if (error) {
      console.warn(`[message-store] insert failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[message-store] unavailable:", error);
    return false;
  }
}

export async function listMessages(limit = 100): Promise<import("@/lib/catalog-types").MessageRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn(`[message-store] list failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as unknown as import("@/lib/catalog-types").MessageRecord[];
}

export async function setMessageRead(id: string, read: boolean): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("messages").update({ read }).eq("id", id);
    if (error) {
      console.warn(`[message-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[message-store] unavailable:", error);
    return false;
  }
}

export async function updateMessage(
  id: string,
  patch: Partial<Pick<import("@/lib/catalog-types").MessageRecord, "name" | "phone" | "email" | "area" | "message">>,
): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("messages").update(patch).eq("id", id);
    if (error) {
      console.warn(`[message-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[message-store] unavailable:", error);
    return false;
  }
}

export async function deleteMessage(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("messages").delete().eq("id", id);
    if (error) {
      console.warn(`[message-store] delete failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[message-store] unavailable:", error);
    return false;
  }
}