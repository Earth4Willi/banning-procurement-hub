import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { Reveal } from "@/components/reveal";
import { QuotationMark } from "@/components/quotation-mark";
import { AboutStory } from "@/components/sections/about-story";
import { StatsBand } from "@/components/sections/stats-band";
import { Certifications } from "@/components/sections/certifications";
import { TeamCta } from "@/components/sections/team-cta";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn how Banning Procurement Hub sources verified building materials, counts every delivery and serves contractors across all 16 regions of Ghana.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <>
      <section className="py-20 lg:py-28" aria-label="About Banning Procurement Hub">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              About us
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              About Banning Procurement Hub
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              A Ghanaian construction procurement company sourcing verified materials and delivering
              them, counted, to building sites nationwide.
            </p>
          </Reveal>
        </div>
      </section>

      <AboutStory />

      <section className="bg-[#0d3d1a] py-20 lg:py-28" aria-label="Our mission and guarantee">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-[16px] border border-white/15 bg-white/5 p-8">
                <QuotationMark className="h-8 w-8 text-accent" />
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-white">Our mission</h2>
                <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-white/80">
                  To make buying construction materials straightforward and trustworthy: verified products,
                  prices confirmed before you order and every delivery counted before it leaves us.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="h-full rounded-[16px] border border-white/15 bg-white/5 p-8">
                <QuotationMark className="h-8 w-8 text-accent" />
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-white">Our guarantee</h2>
                <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-white/80">
                  {siteConfig.guarantee} Quotes within 24 hours, nationwide.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <StatsBand />

      <Certifications />

      <TeamCta />
    </>
  );
}