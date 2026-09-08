"use client";

import { useCallback, useEffect, useState } from "react";

type SessionState = {
  status: "loading" | "signed-out" | "signed-in";
  email?: string;
  error?: string;
};

const GENERIC = "Invalid email, password, or code.";

/**
 * Owner session hook. Cached against `GET /api/auth/me` on mount; exposes
 * optimistic sign-in / sign-out against the cookie-backed routes.
 */
export function useSession() {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { email?: string };
        setState({ status: "signed-in", email: data.email });
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

  const signIn = useCallback(async (input: { email: string; password: string; totpCode: string }) => {
    setState((s) => ({ ...s, error: undefined }));
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        let message = GENERIC;
        try {
          const data = (await res.json()) as { error?: { message?: string } };
          if (data?.error?.message) message = data.error.message;
        } catch {
          // default message
        }
        setState((s) => ({ ...s, error: message }));
        return false;
      }
      setState({ status: "signed-in", email: input.email });
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

  return { ...state, refresh, signIn, signOut };
}