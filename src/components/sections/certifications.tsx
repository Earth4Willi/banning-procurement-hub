"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { certifications, siteConfig } from "@/lib/site";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

export function Certifications() {
  return (
    <section className="bg-surface-alt py-24 lg:py-28" aria-label="Certifications and trust">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <SectionHeading title="Certified, insured and accountable" description={siteConfig.guarantee} />
        </Reveal>
        <div className="mt-12 max-w-3xl divide-y divide-primary/10 rounded-[16px] border border-primary/10 bg-surface">
          {certifications.map((certification) => (
            <div key={certification.name} className="flex items-start gap-4 p-6">
              <CheckCircle weight="duotone" size={24} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <h3 className="font-display text-base font-semibold text-ink">{certification.name}</h3>
                <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-ink-muted">
                  {certification.issuer}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{certification.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}