"use client";

import { useCallback, useEffect, useState } from "react";

type SessionState = {
  status: "loading" | "signed-out" | "signed-in";
  email?: string;
  avatarUrl?: string;
  error?: string;
};

const GENERIC = "Invalid email, password, or code.";

export type BeginLoginResult = { ok: boolean; pendingId?: string };

/**
 * Owner session hook. Cached against `GET /api/auth/me` on mount; exposes the
 * two-phase sign-in (credentials, then authenticator code) against the
 * cookie-backed routes.
 */
export function useSession() {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { email?: string; avatarUrl?: string };
        setState({ status: "signed-in", email: data.email, avatarUrl: data.avatarUrl });
      } else {
        setState({ status: "signed-out" });
      }
    } catch {
      setState({ status: "signed-out" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const beginLogin = useCallback(async (input: { email: string; password: string }): Promise<BeginLoginResult> => {
    setState((s) => ({ ...s, error: undefined }));
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const message = await errorMessage(res);
        setState((s) => ({ ...s, error: message }));
        return { ok: false };
      }
      const data = (await res.json()) as { pendingId?: string };
      if (!data.pendingId) {
        setState((s) => ({ ...s, error: GENERIC }));
        return { ok: false };
      }
      return { ok: true, pendingId: data.pendingId };
    } catch {
      setState((s) => ({ ...s, error: GENERIC }));
      return { ok: false };
    }
  }, []);

  const verifyCode = useCallback(async (pendingId: string, totpCode: string): Promise<boolean> => {
    setState((s) => ({ ...s, error: undefined }));
    try {
      const res = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pendingId, totpCode }),
      });
      if (!res.ok) {
        const message = await errorMessage(res);
        setState((s) => ({ ...s, error: message }));
        return false;
      }
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (me.ok) {
        const data = (await me.json()) as { email?: string; avatarUrl?: string };
        setState((s) => ({
          ...s,
          status: "signed-in",
          email: s.email ?? data.email,
          avatarUrl: s.avatarUrl ?? data.avatarUrl,
        }));
      } else {
        setState((s) => ({ ...s, status: "signed-in" }));
      }
      return true;
    } catch {
      setState((s) => ({ ...s, error: GENERIC }));
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "same-origin" });
    } catch {
      // optimistically sign out anyway
    }
    setState({ status: "signed-out" });
  }, []);

  return { ...state, refresh, beginLogin, verifyCode, signOut };
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    if (data?.error?.message) return data.error.message;
  } catch {
    // fall through
  }
  return GENERIC;
}