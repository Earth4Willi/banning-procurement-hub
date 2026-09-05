import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { ContactChannels } from "@/components/sections/contact-channels";
import { ContactForm } from "@/components/contact-form";
import { OrganizationSchema } from "@/components/organization-schema";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Call, WhatsApp or email Banning Procurement Hub for cement, iron rods, tiles, roofing, plumbing and electricals across Ghana.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <>
      <section className="py-20 lg:py-28" aria-label="Contact Banning Procurement Hub">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Contact us
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Talk to us about your build
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Call, WhatsApp or email the team with your material needs.{" "}
              {siteConfig.responsePromise}.
            </p>
          </Reveal>
        </div>
      </section>

      <ContactChannels />

      <section className="py-20 lg:py-24" aria-label="Delivery areas">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Delivery
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              We deliver across Ghana
            </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted">
              We deliver across all 16 regions of Ghana, with same-day options in Greater Accra.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {siteConfig.deliveryAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-[10px] border border-primary/20 bg-surface-alt px-4 py-2 text-sm font-medium text-ink"
                >
                  {area}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <ContactForm />

      <section className="bg-[#0d3d1a] py-20 lg:py-24" aria-label="Request a quote">
        <div className="mx-auto max-w-[1400px] px-4 text-center md:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
              Prefer a structured quote?
            </h2>
            <p className="mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-white/80">
              Add the materials you need and send an itemised quote on WhatsApp.{" "}
              {siteConfig.responsePromise}.
            </p>
            <div className="mt-8">
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

      <OrganizationSchema />
    </>
  );
}