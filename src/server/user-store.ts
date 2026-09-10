import { getSupabaseClient } from "./audit";

export type CustomerUser = {
  id: string;
  email: string;
  phone: string;
  name: string;
  area: string;
  address: string;
};

export type CustomerUserInput = {
  email: string;
  phone: string;
  name: string;
  area?: string;
  address?: string;
  passwordHash: string;
};

function mapUser(row: Record<string, unknown>): CustomerUser {
  return {
    id: String(row.id),
    email: String(row.email),
    phone: String(row.phone),
    name: String(row.name ?? ""),
    area: String(row.area ?? ""),
    address: String(row.address ?? ""),
  };
}

export async function createUser(input: CustomerUserInput): Promise<CustomerUser | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("users")
      .insert({
        email: input.email,
        phone: input.phone,
        name: input.name,
        area: input.area ?? "",
        address: input.address ?? "",
        password_hash: input.passwordHash,
      })
      .select("id, email, phone, name, area, address")
      .single();
    if (error || !data) {
      if (error) console.warn(`[user-store] create failed: ${error.message}`);
      return null;
    }
    return mapUser(data as unknown as Record<string, unknown>);
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<CustomerUser | null> {
  return findUser(async (client) =>
    client.from("users").select("id, email, phone, name, area, address").eq("email", email).maybeSingle(),
  );
}

export type CustomerUserWithPassword = CustomerUser & { password_hash: string };

export async function findUserByEmailWithPassword(email: string): Promise<CustomerUserWithPassword | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("users")
      .select("id, email, phone, name, area, address, password_hash")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      console.warn(`[user-store] find failed: ${error.message}`);
      return null;
    }
    if (!data) return null;
    return mapUserWithPassword(data as unknown as Record<string, unknown>);
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return null;
  }
}

export async function findUserByIdWithPassword(id: string): Promise<CustomerUserWithPassword | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("users")
      .select("id, email, phone, name, area, address, password_hash")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.warn(`[user-store] find failed: ${error.message}`);
      return null;
    }
    if (!data) return null;
    return mapUserWithPassword(data as unknown as Record<string, unknown>);
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return null;
  }
}

function mapUserWithPassword(row: Record<string, unknown>): CustomerUserWithPassword {
  return {
    id: String(row.id),
    email: String(row.email),
    phone: String(row.phone),
    name: String(row.name ?? ""),
    area: String(row.area ?? ""),
    address: String(row.address ?? ""),
    password_hash: String(row.password_hash ?? ""),
  };
}

export async function findUserByPhone(phone: string): Promise<CustomerUser | null> {
  return findUser(async (client) =>
    client.from("users").select("id, email, phone, name, area, address").eq("phone", phone).maybeSingle(),
  );
}

export async function findUserById(id: string): Promise<CustomerUser | null> {
  return findUser(async (client) =>
    client.from("users").select("id, email, phone, name, area, address").eq("id", id).maybeSingle(),
  );
}

async function findUser(
  query: (client: NonNullable<ReturnType<typeof getSupabaseClient>>) => Promise<{ data: unknown; error: { message: string } | null }>,
): Promise<CustomerUser | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await query(client);
    if (error) {
      console.warn(`[user-store] find failed: ${error.message}`);
      return null;
    }
    return data ? mapUser(data as unknown as Record<string, unknown>) : null;
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return null;
  }
}

export async function updateCustomerProfile(id: string, patch: Partial<CustomerUser>): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of ["name", "email", "phone", "area", "address"] as const) {
      if (patch[field] !== undefined) dbPatch[field] = patch[field];
    }
    const { error } = await client
      .from("users")
      .update(dbPatch)
      .eq("id", id);
    if (error) {
      console.warn(`[user-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return false;
  }
}

export async function updateCustomerPasswordHash(id: string, hash: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client
      .from("users")
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.warn(`[user-store] password update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return false;
  }
}

/**
 * Claims the caller's anonymous quotes (same phone, not yet attached to a
 * user) at registration/login so order history follows the new account.
 * Caps the adoption batch to 200 quotes.
 */
export async function autoAdoptQuotes(phone: string, userId: string): Promise<number> {
  try {
    const client = getSupabaseClient();
    if (!client) return 0;
    const { data, error } = await client
      .from("quotes")
      .update({ user_id: userId })
      .eq("phone", phone)
      .is("user_id", null)
      .select("id")
      .limit(200);
    if (error) {
      console.warn(`[user-store] quote adoption failed: ${error.message}`);
      return 0;
    }
    return (data ?? []).length;
  } catch (error) {
    console.warn("[user-store] unavailable:", error);
    return 0;
  }
}