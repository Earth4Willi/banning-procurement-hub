"use client";

import Link from "next/link";
import { Compass, MagnifyingGlass, ChatsCircle, Truck, type Icon } from "@phosphor-icons/react";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { siteConfig } from "@/lib/site";

type Step = {
  number: string;
  icon: Icon;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    number: "01",
    icon: Compass,
    title: "Discover",
    text: "Find every material your project needs in one catalogue.",
  },
  {
    number: "02",
    icon: MagnifyingGlass,
    title: "Browse",
    text: "Compare brands and prices, then add the quantities you want.",
  },
  {
    number: "03",
    icon: ChatsCircle,
    title: "Quote",
    text: `Send your list on WhatsApp and get ${siteConfig.responsePromise}.`,
  },
  {
    number: "04",
    icon: Truck,
    title: "Deliver",
    text: "Verified materials arrive at your site, checked and counted.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface-alt py-24 lg:py-28" aria-label="How it works">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <SectionHeading kicker="How it works" title="From list to delivery in four steps" align="center" />
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <div className="h-full border-t border-primary/10 pt-6">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-medium text-ink-muted">{step.number}</span>
                  <step.icon weight="duotone" size={28} className="text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <div className="mt-12 text-center">
            <Link
              href="/quote"
              className="inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
            >
              Get a Quote
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}