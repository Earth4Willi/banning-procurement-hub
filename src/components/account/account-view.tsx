"use client";

import { useEffect, useState } from "react";
import { CaretRight, CircleNotch, MapPin, ShieldCheck, SignIn, UserCircle } from "@phosphor-icons/react";
import { api, formatDate, formatItems, inputClass, statusPill } from "@/components/admin/helpers";
import { money } from "@/lib/quote-document";
import { useSession } from "@/lib/use-session";
import { siteConfig } from "@/lib/site";
import {
  validateDelivery,
  validatePasswordChange,
  validateProfile,
  type DeliveryFieldErrors,
  type PasswordChangeErrors,
  type ProfileFieldErrors,
} from "@/lib/validation";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "delivery", label: "Delivery" },
  { id: "security", label: "Security" },
  { id: "orders", label: "My Orders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank: "Bank Transfer",
  other: "Other",
};

type ProfilePayload = { role: string; email: string; name: string; phone: string; area: string; address: string };

type OrderItem = { slug: string; label: string; quantity: number; unitPrice?: number };

type Order = {
  reference: string;
  status: "new" | "reviewed" | "won" | "lost" | string;
  created_at: string;
  items: OrderItem[];
  totals: { amount: number | null; currency: string };
  payment_method: string | null;
  doc_link: string | null;
};

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export function AccountView() {
  const session = useSession();
  const [tab, setTab] = useState<TabId>("profile");
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "" });
  const [deliveryForm, setDeliveryForm] = useState({ area: "", address: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryFieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordChangeErrors>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "signed-in" || session.role !== "customer") return;
    let cancelled = false;
    void (async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          api<ProfilePayload>("/api/account/profile"),
          api<{ orders: Order[] }>("/api/account/orders"),
        ]);
        if (cancelled) return;
        setProfile(profileRes);
        setProfileForm({ name: profileRes.name, email: profileRes.email, phone: profileRes.phone });
        setDeliveryForm({ area: profileRes.area, address: profileRes.address });
        setOrders(ordersRes.orders);
      } catch {
        // Guarded UI below handles signed-out / owner; ignore fetch noise.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.status, session.role]);

  useEffect(() => {
    setSaved(null);
    setError(null);
  }, [tab]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProfile(profileForm);
    setProfileErrors(nextErrors);
    setError(null);
    setSaved(null);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      const updated = await api<{ ok: boolean; user: ProfilePayload }>("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      setProfile(updated.user);
      setProfileForm({ name: updated.user.name, email: updated.user.email, phone: updated.user.phone });
      setSaved("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your profile.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDelivery(deliveryForm);
    setDeliveryErrors(nextErrors);
    setError(null);
    setSaved(null);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      await api<{ ok: boolean }>("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify(deliveryForm),
      });
      setSaved("Delivery details updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update delivery details.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePasswordChange(passwordForm);
    setPasswordErrors(nextErrors);
    setError(null);
    setSaved(null);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      await api<{ ok: boolean }>("/api/account/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSaved("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your password.");
    } finally {
      setBusy(false);
    }
  }

  if (session.status === "loading") {
    return (
      <div className="flex min-h-[320px] items-center justify-center" aria-label="Checking session">
        <p className="text-base text-ink-muted">Checking session…</p>
      </div>
    );
  }

  if (session.status === "signed-out") {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-md flex-col items-center justify-center text-center">
        <UserCircle weight="duotone" size={40} className="text-accent-dark" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
          Sign in to view your orders
        </h2>
        <p className="mt-2 max-w-[45ch] text-sm leading-relaxed text-ink-muted">
          Sign in to manage your profile, delivery details and orders. New customer? It only takes a minute.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
        >
          <SignIn weight="duotone" size={16} aria-hidden="true" />
          Sign in
        </a>
      </div>
    );
  }

  if (session.role === "owner") {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-md flex-col items-center justify-center text-center">
        <ShieldCheck weight="duotone" size={40} className="text-accent-dark" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
          This area is for customers
        </h2>
        <p className="mt-2 max-w-[45ch] text-sm leading-relaxed text-ink-muted">
          Your dashboard is the best place to manage quotes, orders and customers.
        </p>
        <a
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-[10px] border border-primary/20 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt"
        >
          Go to Admin dashboard
          <CaretRight weight="duotone" size={14} aria-hidden="true" />
        </a>
      </div>
    );
  }

  const fieldError = (id: string, message: string | undefined) =>
    message ? (
      <p id={id} role="alert" className="mt-2 text-sm text-red-700">
        {message}
      </p>
    ) : null;

  return (
    <div>
      <h1 className="sr-only">My account</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-64 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-2" aria-label="Account sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={`shrink-0 rounded-[10px] border px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                  tab === item.id
                    ? "border-accent/60 bg-accent/15 text-ink"
                    : "border-transparent text-ink-muted hover:bg-surface-alt hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1">
          {saved ? (
            <p role="status" className="mb-4 rounded-[10px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary-700">
              {saved}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mb-4 rounded-[10px] border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          {tab === "profile" ? (
            <form
              onSubmit={saveProfile}
              noValidate
              className="rounded-[16px] border border-primary/10 bg-surface-alt p-6 sm:p-8"
            >
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Profile</h2>
              <p className="mt-1 text-sm text-ink-muted">Your name, email and phone number.</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="profile-name" className="text-sm font-medium text-ink">
                    Full name<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    id="profile-name"
                    name="profile-name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    aria-invalid={profileErrors.name ? true : undefined}
                    aria-describedby={profileErrors.name ? "profile-name-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(profileErrors.name))}`}
                  />
                  {fieldError("profile-name-error", profileErrors.name)}
                </div>
                <div>
                  <label htmlFor="profile-phone" className="text-sm font-medium text-ink">
                    Phone<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    id="profile-phone"
                    name="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    aria-invalid={profileErrors.phone ? true : undefined}
                    aria-describedby={profileErrors.phone ? "profile-phone-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(profileErrors.phone))}`}
                  />
                  {fieldError("profile-phone-error", profileErrors.phone)}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="profile-email" className="text-sm font-medium text-ink">
                    Email<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    id="profile-email"
                    name="profile-email"
                    type="email"
                    autoComplete="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    aria-invalid={profileErrors.email ? true : undefined}
                    aria-describedby={profileErrors.email ? "profile-email-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(profileErrors.email))}`}
                  />
                  {fieldError("profile-email-error", profileErrors.email)}
                </div>
              </div>
              <button type="submit" disabled={busy} className={`mt-7 ${buttonClass}`}>
                {busy ? <CircleNotch size={15} className="animate-spin" aria-hidden="true" /> : null}
                Save profile
              </button>
            </form>
          ) : null}

          {tab === "delivery" ? (
            <form
              onSubmit={saveDelivery}
              noValidate
              className="rounded-[16px] border border-primary/10 bg-surface-alt p-6 sm:p-8"
            >
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Delivery</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                <MapPin weight="duotone" size={14} aria-hidden="true" />
                Where your materials should be delivered.
              </p>
              <div className="mt-6 grid gap-5">
                <div>
                  <label htmlFor="delivery-area" className="text-sm font-medium text-ink">
                    Delivery area<span className="text-accent-dark"> *</span>
                  </label>
                  <select
                    id="delivery-area"
                    name="delivery-area"
                    value={deliveryForm.area}
                    onChange={(event) =>
                      setDeliveryForm((prev) => ({ ...prev, area: event.target.value }))
                    }
                    aria-invalid={deliveryErrors.area ? true : undefined}
                    aria-describedby={deliveryErrors.area ? "delivery-area-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(deliveryErrors.area))}`}
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
                  {fieldError("delivery-area-error", deliveryErrors.area)}
                </div>
                <div>
                  <label htmlFor="delivery-address" className="text-sm font-medium text-ink">
                    Delivery address
                  </label>
                  <input
                    id="delivery-address"
                    name="delivery-address"
                    type="text"
                    autoComplete="street-address"
                    maxLength={500}
                    value={deliveryForm.address}
                    onChange={(event) =>
                      setDeliveryForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                    aria-invalid={deliveryErrors.address ? true : undefined}
                    aria-describedby={deliveryErrors.address ? "delivery-address-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(deliveryErrors.address))}`}
                  />
                  {fieldError("delivery-address-error", deliveryErrors.address)}
                </div>
              </div>
              <button type="submit" disabled={busy} className={`mt-7 ${buttonClass}`}>
                {busy ? <CircleNotch size={15} className="animate-spin" aria-hidden="true" /> : null}
                Save delivery details
              </button>
            </form>
          ) : null}

          {tab === "security" ? (
            <form
              onSubmit={savePassword}
              noValidate
              className="rounded-[16px] border border-primary/10 bg-surface-alt p-6 sm:p-8"
            >
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Security</h2>
              <p className="mt-1 text-sm text-ink-muted">Change your password. You&apos;ll stay signed in.</p>
              <div className="mt-6 grid gap-5">
                <div>
                  <label htmlFor="current-password" className="text-sm font-medium text-ink">
                    Current password<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                    aria-invalid={passwordErrors.currentPassword ? true : undefined}
                    aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(passwordErrors.currentPassword))}`}
                  />
                  {fieldError("current-password-error", passwordErrors.currentPassword)}
                </div>
                <div>
                  <label htmlFor="new-password" className="text-sm font-medium text-ink">
                    New password<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    aria-invalid={passwordErrors.newPassword ? true : undefined}
                    aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(passwordErrors.newPassword))}`}
                  />
                  {fieldError("new-password-error", passwordErrors.newPassword)}
                </div>
                <div>
                  <label htmlFor="confirm-password" className="text-sm font-medium text-ink">
                    Confirm new password<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    aria-invalid={passwordErrors.confirmPassword ? true : undefined}
                    aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
                    className={`mt-2 ${inputClass(Boolean(passwordErrors.confirmPassword))}`}
                  />
                  {fieldError("confirm-password-error", passwordErrors.confirmPassword)}
                </div>
              </div>
              <button type="submit" disabled={busy} className={`mt-7 ${buttonClass}`}>
                {busy ? <CircleNotch size={15} className="animate-spin" aria-hidden="true" /> : null}
                Update password
              </button>
            </form>
          ) : null}

          {tab === "orders" ? (
            <section aria-label="Order history">
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">My Orders</h2>
              <p className="mt-1 text-sm text-ink-muted">Quotes and orders placed with your account.</p>
              {orders.length === 0 ? (
                <div className="mt-6 rounded-[16px] border border-dashed border-primary/20 bg-surface-alt p-10 text-center">
                  <p className="text-base text-ink-muted">No orders yet.</p>
                  <a
                    href="/quote"
                    className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light"
                  >
                    Start a quote
                    <CaretRight weight="duotone" size={14} aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <ul className="mt-6 space-y-4">
                  {orders.map((order) => (
                    <li key={order.reference} className="rounded-[16px] border border-primary/10 bg-surface-alt p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-base font-semibold text-ink">{order.reference}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{formatDate(order.created_at)}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPill(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <p className="mt-4 text-sm text-ink">{formatItems(order.items)}</p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-4">
                        <div className="text-xs text-ink-muted">
                          <p>
                            Payment:{" "}
                            <span className="font-medium text-ink">
                              {order.payment_method ? PAYMENT_LABEL[order.payment_method] ?? order.payment_method : "—"}
                            </span>
                          </p>
                          {order.doc_link ? (
                            <a
                              href={order.doc_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-accent-dark"
                            >
                              Download quote PDF
                            </a>
                          ) : null}
                        </div>
                        <p className="font-display text-lg font-semibold text-ink">
                          {typeof order.totals.amount === "number" ? money(order.totals.amount) : "TBC"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}