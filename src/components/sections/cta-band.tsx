"use client";

import Link from "next/link";
import { Phone } from "@phosphor-icons/react";
import { Reveal } from "@/components/reveal";
import { siteConfig } from "@/lib/site";

export function CtaBand() {
  return (
    <section className="bg-[#0d3d1a] py-24 lg:py-28" aria-label="Request a quote">
      <div className="mx-auto max-w-[1400px] px-4 text-center md:px-6">
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
            Getting a quote takes two minutes
          </h2>
          <p className="mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-white/80">
            Tell us what your project needs. {siteConfig.responsePromise}.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/quote"
              className="inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
            >
              Get a Quote
            </Link>
            <a
              href={`tel:${siteConfig.phoneIntl}`}
              className="inline-flex items-center gap-2 rounded-[10px] border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5"
            >
              <Phone weight="duotone" size={16} />
              Call {siteConfig.phoneDisplay}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}