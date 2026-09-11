import { getSupabaseClient } from "./audit";
import type { StaffScope } from "./staff-scopes";

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  scopes: StaffScope[];
  active: boolean;
  createdAt: string | null;
};

export type StaffMemberWithPassword = StaffMember & { passwordHash: string; totpSecret: string | null };

export type StaffInput = {
  email: string;
  name: string;
  passwordHash: string;
  scopes?: StaffScope[];
  totpSecret?: string | null;
};

function parseScopes(value: unknown): StaffScope[] {
  if (Array.isArray(value)) {
    return value.map((s) => String(s)).filter((s): s is StaffScope => isStaffScope(s));
  }
  return [];
}

function isStaffScope(value: string): value is StaffScope {
  const allowed: readonly string[] = [
    "messages",
    "customers",
    "materials",
    "inventory",
    "analytics",
    "settings",
    "staff",
    "profile",
  ];
  return allowed.includes(value);
}

function mapStaff(row: Record<string, unknown>): StaffMember {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    scopes: parseScopes(row.scopes),
    active: row.active !== false,
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

function mapStaffWithPassword(row: Record<string, unknown>): StaffMemberWithPassword {
  return {
    ...mapStaff(row),
    passwordHash: String(row.password_hash ?? ""),
    totpSecret: row.totp_secret ? String(row.totp_secret) : null,
  };
}

/** Owner-created staff → storage failure → null (route emits a 503). */
export async function createStaff(input: StaffInput): Promise<StaffMember | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("staff")
      .insert({
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        password_hash: input.passwordHash,
        scopes: input.scopes?.length ? input.scopes : ["messages"],
        totp_secret: input.totpSecret ?? null,
      })
      .select("id, email, name, scopes, active, created_at")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) return null;
      console.warn(`[staff-store] create failed: ${error.message}`);
      return null;
    }
    return mapStaff(data as unknown as Record<string, unknown>);
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return null;
  }
}

export async function findStaffByEmail(email: string): Promise<StaffMember | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("staff")
      .select("id, email, name, scopes, active, created_at")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) {
      console.warn(`[staff-store] find failed: ${error.message}`);
      return null;
    }
    return data ? mapStaff(data as unknown as Record<string, unknown>) : null;
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return null;
  }
}

export async function findStaffByEmailWithPassword(email: string): Promise<StaffMemberWithPassword | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("staff")
      .select("id, email, name, scopes, active, created_at, password_hash, totp_secret")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) {
      console.warn(`[staff-store] find failed: ${error.message}`);
      return null;
    }
    return data ? mapStaffWithPassword(data as unknown as Record<string, unknown>) : null;
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return null;
  }
}

export async function findStaffById(id: string): Promise<StaffMember | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("staff")
      .select("id, email, name, scopes, active, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.warn(`[staff-store] findById failed: ${error.message}`);
      return null;
    }
    return data ? mapStaff(data as unknown as Record<string, unknown>) : null;
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return null;
  }
}

export async function findStaffByIdWithTotpSecret(id: string): Promise<StaffMemberWithPassword | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("staff")
      .select("id, email, name, scopes, active, created_at, password_hash, totp_secret")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.warn(`[staff-store] findByIdWithTotpSecret failed: ${error.message}`);
      return null;
    }
    return data ? mapStaffWithPassword(data as unknown as Record<string, unknown>) : null;
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return null;
  }
}

export async function listStaff(): Promise<StaffMember[]> {
  try {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from("staff")
      .select("id, email, name, scopes, active, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.warn(`[staff-store] list failed: ${error.message}`);
      return [];
    }
    return (data ?? []).map((row) => mapStaff(row as unknown as Record<string, unknown>));
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return [];
  }
}

export type StaffPatch = {
  name?: string;
  scopes?: StaffScope[];
  active?: boolean;
  passwordHash?: string;
  totpSecret?: string | null;
};

export async function updateStaff(id: string, patch: StaffPatch): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name.trim();
    if (patch.scopes !== undefined) dbPatch.scopes = patch.scopes;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (patch.passwordHash !== undefined) dbPatch.password_hash = patch.passwordHash;
    if (patch.totpSecret !== undefined) dbPatch.totp_secret = patch.totpSecret;
    if (Object.keys(dbPatch).length > 0) dbPatch.updated_at = new Date().toISOString();
    const { error } = await client.from("staff").update(dbPatch).eq("id", id);
    if (error) {
      console.warn(`[staff-store] update failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return false;
  }
}

export async function deleteStaff(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from("staff").delete().eq("id", id);
    if (error) {
      console.warn(`[staff-store] delete failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[staff-store] unavailable:", error);
    return false;
  }
}