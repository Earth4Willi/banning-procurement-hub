"use client";

import { useState } from "react";
import Link from "next/link";
import { LockKey, SignIn } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { api, inputClass } from "@/components/admin/helpers";
import { siteConfig } from "@/lib/site";
import { validateRegister, type RegisterFieldErrors } from "@/lib/validation";
import { track } from "@/lib/analytics";

const EMPTY = { name: "", phone: "", email: "", area: "", address: "", password: "", confirmPassword: "" };

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateRegister(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      await api<{ ok: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          area: values.area,
          address: values.address.trim(),
          password: values.password,
        }),
      });
      track("signup_completed", { method: "email" });
      router.push("/account");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create your account.");
      setBusy(false);
    }
  };

  const setField = (field: keyof typeof EMPTY, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  const errorFor = (field: keyof typeof errors) => errors[field] ?? undefined;
  const errorId = (id: string, field: keyof typeof errors) => (errorFor(field) ? `${id}-error` : undefined);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[16px] border border-primary/10 bg-surface-alt p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="register-name" className="text-sm font-medium text-ink">
            Full name<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            aria-required="true"
            aria-invalid={errorFor("name") ? true : undefined}
            aria-describedby={errorId("register-name", "name")}
            className={`mt-2 ${inputClass(Boolean(errorFor("name")))}`}
          />
          {errorFor("name") ? (
            <p id="register-name-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("name")}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-phone" className="text-sm font-medium text-ink">
            Phone<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => setField("phone", event.target.value)}
            aria-required="true"
            aria-invalid={errorFor("phone") ? true : undefined}
            aria-describedby={errorId("register-phone", "phone") ?? "register-phone-helper"}
            placeholder="055 885 0667"
            className={`mt-2 ${inputClass(Boolean(errorFor("phone")))}`}
          />
          {!errorFor("phone") ? (
            <p id="register-phone-helper" className="mt-2 text-xs text-ink-muted">
              Use 0XX or +233.
            </p>
          ) : null}
          {errorFor("phone") ? (
            <p id="register-phone-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("phone")}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-email" className="text-sm font-medium text-ink">
            Email<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            aria-required="true"
            aria-invalid={errorFor("email") ? true : undefined}
            aria-describedby={errorId("register-email", "email")}
            className={`mt-2 ${inputClass(Boolean(errorFor("email")))}`}
          />
          {errorFor("email") ? (
            <p id="register-email-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("email")}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-area" className="text-sm font-medium text-ink">
            Delivery area<span className="text-accent-dark"> *</span>
          </label>
          <select
            id="register-area"
            name="area"
            value={values.area}
            onChange={(event) => setField("area", event.target.value)}
            aria-required="true"
            aria-invalid={errorFor("area") ? true : undefined}
            aria-describedby={errorId("register-area", "area")}
            className={`mt-2 ${inputClass(Boolean(errorFor("area")))}`}
          >
            <option value="" disabled>
              Select your area…
            </option>
            {siteConfig.deliveryAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          {errorFor("area") ? (
            <p id="register-area-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("area")}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="register-address" className="text-sm font-medium text-ink">
            Delivery address<span className="text-ink-muted"> (optional)</span>
          </label>
          <input
            id="register-address"
            name="address"
            type="text"
            autoComplete="street-address"
            maxLength={500}
            value={values.address}
            onChange={(event) => setField("address", event.target.value)}
            aria-invalid={errorFor("address") ? true : undefined}
            aria-describedby={errorId("register-address", "address") ?? "register-address-helper"}
            className={`mt-2 ${inputClass(Boolean(errorFor("address")))}`}
          />
          {errorFor("address") ? (
            <p id="register-address-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("address")}
            </p>
          ) : (
            <p id="register-address-helper" className="mt-2 text-xs text-ink-muted">
              Optional. e.g. Plot 24, Spintex Road, Accra.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-password" className="text-sm font-medium text-ink">
            Password<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => setField("password", event.target.value)}
            aria-required="true"
            aria-invalid={errorFor("password") ? true : undefined}
            aria-describedby={errorId("register-password", "password") ?? "register-password-helper"}
            className={`mt-2 ${inputClass(Boolean(errorFor("password")))}`}
          />
          {errorFor("password") ? (
            <p id="register-password-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("password")}
            </p>
          ) : (
            <p id="register-password-helper" className="mt-2 text-xs text-ink-muted">
              8-200 characters, with an uppercase letter, a lowercase letter and a number.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="text-sm font-medium text-ink">
            Confirm password<span className="text-accent-dark"> *</span>
          </label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => setField("confirmPassword", event.target.value)}
            aria-required="true"
            aria-invalid={errorFor("confirmPassword") ? true : undefined}
            aria-describedby={errorId("register-confirm-password", "confirmPassword")}
            className={`mt-2 ${inputClass(Boolean(errorFor("confirmPassword")))}`}
          />
          {errorFor("confirmPassword") ? (
            <p id="register-confirm-password-error" role="alert" className="mt-2 text-sm text-red-700">
              {errorFor("confirmPassword")}
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
        <LockKey weight="duotone" size={16} aria-hidden="true" />
        {busy ? "Creating account…" : "Create account"}
      </button>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-accent-dark">
          <SignIn weight="duotone" size={13} aria-hidden="true" />
          Sign in
        </Link>
      </p>
    </form>
  );
}