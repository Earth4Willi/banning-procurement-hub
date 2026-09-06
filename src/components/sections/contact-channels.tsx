"use client";

import { Phone, WhatsappLogo, EnvelopeSimple, Clock, MapPin } from "@phosphor-icons/react";
import { Reveal } from "@/components/reveal";
import { ContactCard } from "@/components/contact-card";
import { siteConfig } from "@/lib/site";

const whatsappMessage = encodeURIComponent("Hello Banning Procurement Hub, I would like a quote.");

const linkClass =
  "rounded-[10px] font-display text-xl font-semibold text-ink transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 [overflow-wrap:anywhere]";

const subClass = "mt-1 text-xs leading-relaxed text-ink-muted";

export function ContactChannels() {
  return (
    <section className="py-20 lg:py-24" aria-label="Contact channels">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-8">
          <div className="grid min-w-0 content-start gap-6 sm:grid-cols-2">
            <Reveal>
              <ContactCard icon={<Phone weight="duotone" size={20} />} title="Call us">
                <a href={`tel:${siteConfig.phoneIntl}`} className={linkClass}>
                  {siteConfig.phoneDisplay}
                </a>
                <p className={subClass}>{siteConfig.hours.summary}</p>
              </ContactCard>
            </Reveal>

            <Reveal delay={0.05}>
              <ContactCard icon={<WhatsappLogo weight="duotone" size={20} />} title="WhatsApp">
                <a
                  href={`https://wa.me/${siteConfig.whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Chat now
                </a>
                <p className={subClass}>{siteConfig.responsePromise}</p>
              </ContactCard>
            </Reveal>

            <Reveal delay={0.1}>
              <ContactCard icon={<EnvelopeSimple weight="duotone" size={20} />} title="Email">
                <a href={`mailto:${siteConfig.email}`} className={linkClass}>
                  {siteConfig.email}
                </a>
                <p className={subClass}>For written enquiries and order documents.</p>
              </ContactCard>
            </Reveal>

            <Reveal delay={0.15}>
              <ContactCard icon={<MapPin weight="duotone" size={20} />} title="Location">
                <p className="font-display text-xl font-semibold text-ink">
                  {siteConfig.addressShort}
                </p>
                <p className={subClass}>{siteConfig.address}</p>
              </ContactCard>
            </Reveal>

            <Reveal delay={0.2} className="sm:col-span-2">
              <ContactCard icon={<Clock weight="duotone" size={20} />} title="Opening hours">
                <p className="font-display text-xl font-semibold text-ink">
                  {siteConfig.hours.summary}
                </p>
                <p className={subClass}>{siteConfig.hours.detail}</p>
              </ContactCard>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="h-full min-w-0">
            <div className="flex h-full flex-col rounded-[16px] bg-[#0d3d1a] p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent text-[#0d3d1a]">
                <MapPin weight="duotone" size={20} />
              </span>
              <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Where to find us
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                {siteConfig.addressShort}
              </h2>
              <p className="mt-3 max-w-[45ch] text-base leading-relaxed text-white/80">
                {siteConfig.address}
              </p>
              <p className="mt-6 border-t border-white/15 pt-5 text-sm leading-relaxed text-white/80">
                Our office address is shared on request. Same-day delivery available in Greater
                Accra.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}