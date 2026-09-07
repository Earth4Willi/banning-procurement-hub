"use client";

import { Phone, WhatsappLogo, EnvelopeSimple, MapPin } from "@phosphor-icons/react";
import { categories, siteConfig, certifications } from "@/lib/site";
import { BrandLogo } from "./brand-logo";

export function Footer() {
  const year = new Date().getFullYear();
  const whatsappMsg = encodeURIComponent("Hello Banning Procurement Hub, I would like a quote.");

  return (
    <footer className="border-t border-primary/10 bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo />
            <p className="text-sm leading-relaxed text-ink-muted">{siteConfig.tagline}</p>
            <div className="flex gap-3">
              <a
                href={`tel:${siteConfig.phoneIntl}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                aria-label="Call us"
              >
                <Phone weight="duotone" size={18} />
              </a>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                aria-label="Chat on WhatsApp"
              >
                <WhatsappLogo weight="duotone" size={18} />
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                aria-label="Send email"
              >
                <EnvelopeSimple weight="duotone" size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink">Categories</h3>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a href={`/products/${cat.id}`} className="text-sm text-ink-muted transition-colors hover:text-ink">
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink">Quick Links</h3>
            <ul className="space-y-2.5">
              <li><a href="/" className="text-sm text-ink-muted transition-colors hover:text-ink">Home</a></li>
              <li><a href="/products" className="text-sm text-ink-muted transition-colors hover:text-ink">All Materials</a></li>
              <li><a href="/about" className="text-sm text-ink-muted transition-colors hover:text-ink">About</a></li>
              <li><a href="/contact" className="text-sm text-ink-muted transition-colors hover:text-ink">Contact</a></li>
              <li><a href="/privacy" className="text-sm text-ink-muted transition-colors hover:text-ink">Privacy Policy</a></li>
              <li><a href="/terms" className="text-sm text-ink-muted transition-colors hover:text-ink">Terms of Service</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Phone weight="duotone" size={16} className="mt-0.5 shrink-0 text-primary-500" />
                <div>
                  <a href={`tel:${siteConfig.phoneIntl}`} className="text-sm font-medium text-ink transition-colors hover:text-primary-500">
                    {siteConfig.phoneDisplay}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <WhatsappLogo weight="duotone" size={16} className="mt-0.5 shrink-0 text-[#25D366]" />
                <a
                  href={`https://wa.me/${siteConfig.whatsappNumber}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  WhatsApp us
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin weight="duotone" size={16} className="mt-0.5 shrink-0 text-primary-500" />
                <span className="text-sm text-ink-muted">{siteConfig.addressShort}</span>
              </li>
            </ul>

            <div className="rounded-[16px] bg-surface p-3">
              <p className="text-xs font-medium text-ink">{siteConfig.hours.summary}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Response: {siteConfig.responsePromise}</p>
            </div>

            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {certifications.map((cert) => (
                  <span key={cert.name} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary-500">
                    {cert.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-primary/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-xs text-ink-muted">
            &copy; {year} Banning Procurement Hub. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-ink-muted transition-colors hover:text-ink">Privacy</a>
            <a href="/terms" className="text-xs text-ink-muted transition-colors hover:text-ink">Terms</a>
            <a
              href="mailto:appianda@proton.me"
              className="text-xs text-ink-muted transition-colors hover:text-ink"
            >
              Made by <span className="font-semibold text-ink">WILSTACK</span>
              <span className="text-primary-500">//</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
