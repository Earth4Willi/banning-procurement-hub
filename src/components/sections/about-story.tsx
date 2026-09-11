import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

const storyParagraphs = [
  "Banning Procurement Hub is a professional procurement and sourcing service with practical experience working within the construction and real estate industry, supporting projects with the sourcing, evaluation, negotiation, and supply of essential building and finishing materials.",
  "We help homeowners, contractors, real estate developers, architects, and businesses procure quality materials at competitive prices while reducing the risks of overpricing, poor-quality products, and unreliable suppliers.",
  "Our experience in construction and real estate procurement gives us a strong understanding of project requirements, material specifications, supplier coordination, cost control, delivery timelines, and quality expectations across different stages of development.",
  "We specialize in sourcing cement, iron rods, tiles, sanitary ware, doors and locks, plumbing and electrical materials, roofing products, kitchen appliances, bathroom fittings, and other construction materials directly from trusted manufacturers, importers, authorized distributors, and wholesalers.",
  "Our services include supplier sourcing, quotation comparison, price negotiation, sample coordination, bulk purchasing, quality verification, and delivery coordination.",
  "At Banning Procurement Hub, our goal is to help clients build smarter, buy better, control costs, and procure with confidence.",
];

const storyFacts = [
  "Accra, Ghana",
  "Construction & Real Estate Procurement",
  "Supplier Sourcing | Price Negotiation | Bulk Supply | Delivery Coordination",
];

export function AboutStory() {
  return (
    <section className="py-20 lg:py-28" aria-label="Our story">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <SectionHeading title="Our story" description="A Ghanaian construction procurement business built on dependable delivery." />
        </Reveal>
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="max-w-[65ch] space-y-5 text-base leading-relaxed text-ink-muted">
              {storyParagraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
              <p className="font-display text-xl font-semibold tracking-tight text-accent-dark">
                Build Smarter. Buy Better. Save More.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {storyFacts.map((fact) => (
                <li key={fact} className="flex items-center gap-3 text-sm font-medium text-ink">
                  <img src="/logo.svg" alt="" aria-hidden="true" height={16} decoding="async" className="logo-light-mode h-4 w-auto shrink-0" />
                  <img src="/logo-dark.svg" alt="" aria-hidden="true" height={16} decoding="async" className="logo-dark-mode h-4 w-auto shrink-0" />
                  {fact}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="overflow-hidden rounded-2xl shadow-[0_24px_48px_-16px_rgba(13,61,26,0.4)]">
              <Image
                src="/about-story.jpg"
                alt="Construction formwork and materials ready for a building project"
                width={800}
                height={600}
                className="h-auto w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
