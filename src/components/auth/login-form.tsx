"use client";

import { useState } from "react";
import Link from "next/link";
import { LinkSimple, SignIn } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { api, inputClass } from "@/components/admin/helpers";
import { validateLogin, type LoginFieldErrors } from "@/lib/validation";
import { track } from "@/lib/analytics";

const EMPTY = { email: "", password: "" };

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      await api<{ ok: boolean }>("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      track("signin_completed", { method: "password" });
      router.push("/account");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in.");
      setBusy(false);
    }
  };

  const setField = (field: keyof typeof EMPTY, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[16px] border border-primary/10 bg-surface-alt p-6 sm:p-8"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-ink">
            Email<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            aria-required="true"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className={`mt-2 ${inputClass(Boolean(errors.email))}`}
          />
          {errors.email ? (
            <p id="login-email-error" role="alert" className="mt-2 text-sm text-red-700">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-ink">
            Password<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => setField("password", event.target.value)}
            aria-required="true"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            className={`mt-2 ${inputClass(Boolean(errors.password))}`}
          />
          {errors.password ? (
            <p id="login-password-error" role="alert" className="mt-2 text-sm text-red-700">
              {errors.password}
            </p>
          ) : null}
        </div>
      </div>

      {formError ? (
        <p role="alert" className="mt-4 rounded-[10px] border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SignIn weight="duotone" size={16} aria-hidden="true" />
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-5 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/register" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-accent-dark">
          Create an account
          <LinkSimple weight="duotone" size={13} aria-hidden="true" />
        </Link>
      </p>
    </form>
  );
}