"use client";

import { Phone, WhatsappLogo } from "@phosphor-icons/react";
import { Reveal } from "@/components/reveal";
import { siteConfig } from "@/lib/site";

export function TeamCta() {
  const whatsappMsg = encodeURIComponent("Hello Banning Procurement Hub, I would like to talk to your team.");

  return (
    <section className="bg-[#0d3d1a] py-24 lg:py-28" aria-label="Talk to our team">
      <div className="mx-auto max-w-[1400px] px-4 text-center md:px-6">
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            Talk to us directly
          </h2>
          <p className="mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-white/80">
            Have a question about materials, pricing or delivery? Call or message the team and we will
            help you get it right. {siteConfig.responsePromise}.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={`tel:${siteConfig.phoneIntl}`}
              className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
            >
              <Phone weight="duotone" size={16} />
              Call {siteConfig.phoneDisplay}
            </a>
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5"
            >
              <WhatsappLogo weight="duotone" size={16} className="text-[#25D366]" />
              Chat on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}