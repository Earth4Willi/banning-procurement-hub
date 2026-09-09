"use client";

import { useRef, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { Reveal } from "@/components/reveal";
import { siteConfig } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";
import { buildQuoteMessage, buildWhatsAppUrl, type QuoteContact } from "@/lib/whatsapp";
import { validateQuoteContact } from "@/lib/validation";
import { submitViaWeb3Forms, web3FormsConfigured } from "@/lib/forms";

const EMPTY: QuoteContact = { name: "", phone: "", email: "", area: "", note: "" };

const inputClass = (hasError: boolean) =>
  `w-full rounded-[10px] border bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:ring-2 ${
    hasError
      ? "border-red-600 focus:border-red-600 focus:ring-red-600/40"
      : "border-primary/20 focus:border-primary focus:ring-accent/60"
  }`;

export function ContactForm() {
  const { lines } = useQuote();
  const [contact, setContact] = useState<QuoteContact>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteContact, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLSelectElement>(null);

  const updateContact = (field: keyof QuoteContact, value: string) => {
    const next = { ...contact, [field]: value };
    setContact(next);
    const nextErrors = validateQuoteContact(next);
    setErrors((prev) => {
      const copy = { ...prev };
      if (field === "note") return copy;
      const key = field as "name" | "phone" | "email" | "area";
      if (nextErrors[key]) {
        copy[key] = nextErrors[key];
      } else {
        delete copy[key];
      }
      return copy;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateQuoteContact(contact);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.name && nameRef.current) nameRef.current.focus();
      else if (nextErrors.phone && phoneRef.current) phoneRef.current.focus();
      else if (nextErrors.email && emailRef.current) emailRef.current.focus();
      else if (nextErrors.area && areaRef.current) areaRef.current.focus();
      return;
    }
    const message = buildQuoteMessage(contact, lines);
    const url = buildWhatsAppUrl(siteConfig.whatsappNumber, message);
    let emailed = false;
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        area: contact.area,
        message: contact.note ?? "",
      }),
    }).catch(() => null);
    if (response?.ok) {
      const payload = (await response.json().catch(() => null)) as { emailed?: boolean } | null;
      emailed = Boolean(payload?.emailed);
    }
    if (!emailed && web3FormsConfigured()) {
      const result = await submitViaWeb3Forms({
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        area: contact.area,
        message: contact.note ?? "",
        subject: "Contact message — Banning Procurement Hub",
      });
      emailed = result.ok;
    }
    setStatus(
      emailed
        ? "Message sent to us by email and opened in WhatsApp."
        : "Opening WhatsApp with your message…"
    );
    window.open(url, "_blank", "noopener");
  };

  const errorText = (field: keyof QuoteContact) => errors[field] ?? undefined;
  const errorId = (field: keyof QuoteContact) => (errorText(field) ? `${field}-error` : undefined);

  return (
    <section className="py-20 lg:py-24" aria-label="Send a message">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                Send us a message
              </h2>
              <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-ink-muted">
                Tell us your details and what you need. The message reaches us by email and is
                ready to send on WhatsApp. {siteConfig.responsePromise}.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <form onSubmit={handleSubmit} className="rounded-[16px] border border-primary/10 bg-surface-alt p-6" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="text-sm font-medium text-ink">
                    Full name<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    ref={nameRef}
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={contact.name}
                    onChange={(event) => updateContact("name", event.target.value)}
                    aria-required="true"
                    aria-describedby={errorId("name")}
                    aria-invalid={errorText("name") ? true : undefined}
                    className={`mt-2 ${inputClass(Boolean(errorText("name")))}`}
                  />
                  {errorText("name") ? (
                    <p id="name-error" role="alert" className="mt-2 text-sm text-red-700">
                      {errorText("name")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="contact-phone" className="text-sm font-medium text-ink">
                    Phone<span className="text-accent-dark"> *</span>
                  </label>
                  <input
                    ref={phoneRef}
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={contact.phone}
                    onChange={(event) => updateContact("phone", event.target.value)}
                    aria-required="true"
                    aria-describedby={errorId("phone") ?? "contact-phone-helper"}
                    aria-invalid={errorText("phone") ? true : undefined}
                    placeholder="055 885 0667"
                    className={`mt-2 ${inputClass(Boolean(errorText("phone")))}`}
                  />
                  {!errorText("phone") ? (
                    <p id="contact-phone-helper" className="mt-2 text-xs text-ink-muted">
                      Use 0XX or +233.
                    </p>
                  ) : null}
                  {errorText("phone") ? (
                    <p id="phone-error" role="alert" className="mt-2 text-sm text-red-700">
                      {errorText("phone")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="contact-email" className="text-sm font-medium text-ink">
                    Email<span className="text-ink-muted"> (optional)</span>
                  </label>
                  <input
                    ref={emailRef}
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={contact.email ?? ""}
                    onChange={(event) => updateContact("email", event.target.value)}
                    aria-describedby={errorId("email")}
                    aria-invalid={errorText("email") ? true : undefined}
                    className={`mt-2 ${inputClass(Boolean(errorText("email")))}`}
                  />
                  {errorText("email") ? (
                    <p id="email-error" role="alert" className="mt-2 text-sm text-red-700">
                      {errorText("email")}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="contact-area" className="text-sm font-medium text-ink">
                    Delivery area<span className="text-accent-dark"> *</span>
                  </label>
                  <select
                    ref={areaRef}
                    id="contact-area"
                    name="area"
                    value={contact.area}
                    onChange={(event) => updateContact("area", event.target.value)}
                    aria-required="true"
                    aria-describedby={errorId("area")}
                    aria-invalid={errorText("area") ? true : undefined}
                    className={`mt-2 ${inputClass(Boolean(errorText("area")))}`}
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
                  {errorText("area") ? (
                    <p id="area-error" role="alert" className="mt-2 text-sm text-red-700">
                      {errorText("area")}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="contact-message" className="text-sm font-medium text-ink">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="note"
                    rows={4}
                    maxLength={500}
                    value={contact.note ?? ""}
                    onChange={(event) => updateContact("note", event.target.value)}
                    className={`mt-2 ${inputClass(false)}`}
                  />
                  <p className="mt-2 text-xs text-ink-muted">
                    Optional. Add quantities, site details or anything else we should know.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
              >
                <PaperPlaneTilt weight="duotone" size={16} aria-hidden="true" />
                Send message
              </button>

              {status ? (
                <p role="status" aria-live="polite" className="mt-4 text-center text-sm font-medium text-primary-700">
                  {status}
                </p>
              ) : null}
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}