"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, TrashSimple } from "@phosphor-icons/react";
import type { BankDetails, DeliverySettings, MarqueeSettings, PaymentSettings, SettingsMap, SiteSettingsContent } from "@/lib/settings-types";
import { api, inputClass } from "./helpers";
import type { Session } from "./helpers";

type SaveState = { status: "idle" | "saving" | "saved"; message: string | null };

export const PAYMENT_OPTIONS = [
  { key: "mobile_money", label: "Mobile Money" },
  { key: "bank", label: "Bank Transfer" },
  { key: "cash", label: "Cash" },
] as const;

export function SettingsView(props: { session: Session; onNeedRefresh: () => void }) {
  const { session, onNeedRefresh } = props;
  const [data, setData] = useState<SettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    let cancelled = false;
    setLoading(true);
    void api<SettingsMap>("/api/admin/settings")
      .then((settings) => {
        if (cancelled) return;
        setData(settings);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading settings…</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
        {error ?? "Settings unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Settings</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Changes go live on the public site immediately.
        </p>
      </div>
      <SiteSection initial={data.site} onSaved={onNeedRefresh} />
      <MarqueeSection initial={data.marquee} onSaved={onNeedRefresh} />
      <PaymentsSection initial={data.payments} onSaved={onNeedRefresh} />
      <DeliverySection initial={data.delivery} onSaved={onNeedRefresh} />
    </div>
  );
}

function SettingsCard(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">{props.title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{props.subtitle}</p>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function Label(props: { text: string; htmlFor?: string }) {
  return (
    <label htmlFor={props.htmlFor} className="mb-1 block text-xs font-semibold text-ink-muted">
      {props.text}
    </label>
  );
}

function TextField(props: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label text={props.label} htmlFor={props.name} />
      <input
        id={props.name}
        name={props.name}
        type="text"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={inputClass(false)}
      />
      {props.hint ? <p className="mt-1 text-xs text-ink-muted">{props.hint}</p> : null}
    </div>
  );
}

function SaveBar(props: { busy: boolean; label: string; state: SaveState }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="submit"
        disabled={props.busy}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:opacity-60"
      >
        {props.busy ? "Saving…" : props.label}
      </button>
      {props.state.status === "saved" ? (
        <span className="text-sm font-medium text-emerald-700">{props.state.message}</span>
      ) : null}
      {props.state.status === "saving" ? (
        <span className="text-sm text-ink-muted">Saving…</span>
      ) : null}
    </div>
  );
}

function SiteSection(props: { initial: SiteSettingsContent; onSaved: () => void }) {
  const [draft, setDraft] = useState<SiteSettingsContent>(props.initial);
  const [state, setState] = useState<SaveState>({ status: "idle", message: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof SiteSettingsContent) => (next: string) =>
    setDraft((current) => ({ ...current, [key]: next }));
  const setHours = (key: "summary" | "detail") => (next: string) =>
    setDraft((current) => ({ ...current, hours: { ...current.hours, [key]: next } }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setState({ status: "saving", message: null });
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "site", value: draft }),
      });
      setState({ status: "saved", message: "Site updated." });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save site settings.");
      setState({ status: "idle", message: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Site & contact" subtitle="Shown across the public site and on documents.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <TextField label="Business name" name="site-name" value={draft.name} onChange={set("name")} />
        <TextField label="Tagline" name="site-tagline" value={draft.tagline} onChange={set("tagline")} />
        <TextField label="Phone (display)" name="site-phoneDisplay" value={draft.phoneDisplay} onChange={set("phoneDisplay")} />
        <TextField label="Phone (international)" name="site-phoneIntl" value={draft.phoneIntl} onChange={set("phoneIntl")} />
        <TextField label="WhatsApp number" name="site-whatsappNumber" value={draft.whatsappNumber} onChange={set("whatsappNumber")} hint="Digits only, e.g. 233558850667." />
        <TextField label="Email" name="site-email" value={draft.email} onChange={set("email")} />
        <TextField label="Address" name="site-address" value={draft.address} onChange={set("address")} />
        <TextField label="Address (short)" name="site-addressShort" value={draft.addressShort} onChange={set("addressShort")} />
        <TextField label="Hours summary" name="site-hours-summary" value={draft.hours.summary} onChange={setHours("summary")} />
        <TextField label="Hours detail" name="site-hours-detail" value={draft.hours.detail} onChange={setHours("detail")} />
        <div className="sm:col-span-2">
          <TextField label="Map embed URL" name="site-mapEmbedUrl" value={draft.mapEmbedUrl} onChange={set("mapEmbedUrl")} />
        </div>
        <TextField label="Response promise" name="site-responsePromise" value={draft.responsePromise} onChange={set("responsePromise")} />
        <div className="sm:col-span-2">
          <TextField label="Guarantee" name="site-guarantee" value={draft.guarantee} onChange={set("guarantee")} />
        </div>
        {error ? (
          <div className="sm:col-span-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <SaveBar busy={busy} label="Save site" state={state} />
        </div>
      </form>
    </SettingsCard>
  );
}

function MarqueeSection(props: { initial: MarqueeSettings; onSaved: () => void }) {
  const [messages, setMessages] = useState<string[]>(props.initial.messages);
  const [state, setState] = useState<SaveState>({ status: "idle", message: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setMessage = (index: number) => (next: string) =>
    setMessages((current) => current.map((message, i) => (i === index ? next : message)));
  const removeMessage = (index: number) =>
    setMessages((current) => current.filter((_, i) => i !== index));
  const addMessage = () => setMessages((current) => [...current, ""]);
  const moveMessage = (index: number, direction: -1 | 1) =>
    setMessages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const save = async () => {
    setBusy(true);
    setError(null);
    setState({ status: "saving", message: null });
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "marquee", value: { messages } }),
      });
      setState({ status: "saved", message: "Marquee updated." });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save marquee.");
      setState({ status: "idle", message: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Marquee" subtitle="The scrolling banner on the home page.">
      {messages.length === 0 ? (
        <p className="text-sm text-ink-muted">No marquee messages yet — add one below.</p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-2"
      >
        {messages.map((message, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              name={`marquee-${index}`}
              type="text"
              value={message}
              onChange={(event) => setMessage(index)(event.target.value)}
              placeholder="Announcement text"
              className={inputClass(false)}
            />
            <button
              type="button"
              onClick={() => moveMessage(index, -1)}
              disabled={index === 0}
              aria-label="Move up"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a] disabled:opacity-40"
            >
              <ArrowUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => moveMessage(index, 1)}
              disabled={index === messages.length - 1}
              aria-label="Move down"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-primary/40 hover:text-[#0d3d1a] disabled:opacity-40"
            >
              <ArrowDown size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => removeMessage(index)}
              aria-label="Remove"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-primary/10 text-ink-muted transition-colors hover:border-red-500/40 hover:text-red-700"
            >
              <TrashSimple size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addMessage}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
        >
          <Plus size={14} aria-hidden="true" /> Add message
        </button>
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}
        <SaveBar busy={busy} label="Save marquee" state={state} />
      </form>
    </SettingsCard>
  );
}

function PaymentsSection(props: { initial: PaymentSettings; onSaved: () => void }) {
  const [methods, setMethods] = useState<string[]>(props.initial.methods);
  const [bank, setBank] = useState<BankDetails>(props.initial.bank);
  const [state, setState] = useState<SaveState>({ status: "idle", message: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleMethod = (key: string) => (checked: boolean) =>
    setMethods((current) => {
      if (checked) return [...current, key];
      return current.filter((method) => method !== key);
    });
  const setBankField = (key: keyof BankDetails) => (next: string) =>
    setBank((current) => ({ ...current, [key]: next }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setState({ status: "saving", message: null });
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "payments", value: { methods, bank } }),
      });
      setState({ status: "saved", message: "Payments updated." });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save payment settings.");
      setState({ status: "idle", message: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Payments & bank" subtitle="Accepted methods and bank transfer details.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-xs font-semibold text-ink-muted">Accepted payment methods</legend>
          {PAYMENT_OPTIONS.map((option) => {
            const checked = methods.includes(option.key);
            return (
              <label
                key={option.key}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
              >
                <input
                  type="checkbox"
                  name={`payment-method-${option.key}`}
                  checked={checked}
                  onChange={(event) => toggleMethod(option.key)(event.target.checked)}
                  className="size-4 rounded border-primary/30 accent-[#0d3d1a]"
                />
                {option.label}
              </label>
            );
          })}
        </fieldset>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField label="Bank name" name="payment-bankName" value={bank.bankName} onChange={setBankField("bankName")} />
          <TextField label="Account name" name="payment-accountName" value={bank.accountName} onChange={setBankField("accountName")} />
          <TextField label="Account number" name="payment-accountNumber" value={bank.accountNumber} onChange={setBankField("accountNumber")} />
        </div>
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}
        <SaveBar busy={busy} label="Save payments" state={state} />
      </form>
    </SettingsCard>
  );
}

function DeliverySection(props: { initial: DeliverySettings; onSaved: () => void }) {
  const [areas, setAreas] = useState<string>(props.initial.areas.join("\n"));
  const [state, setState] = useState<SaveState>({ status: "idle", message: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    setState({ status: "saving", message: null });
    try {
      const list = areas
        .split("\n")
        .map((area) => area.trim())
        .filter((area) => area.length > 0);
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "delivery", value: { areas: list } }),
      });
      setState({ status: "saved", message: "Delivery updated." });
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save delivery settings.");
      setState({ status: "idle", message: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Delivery" subtitle="Areas you deliver to, one per line.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <textarea
          name="delivery-areas"
          rows={6}
          value={areas}
          onChange={(event) => setAreas(event.target.value)}
          className={`${inputClass(false)} resize-y font-mono text-sm`}
        />
        {error ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}
        <SaveBar busy={busy} label="Save delivery" state={state} />
      </form>
    </SettingsCard>
  );
}
