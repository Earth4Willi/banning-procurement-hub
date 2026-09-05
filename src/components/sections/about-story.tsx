import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

const storyParagraphs = [
  "Banning Procurement Hub supplies building materials to contractors and self-builders across Ghana. We started with a simple observation: too many projects slow down because materials arrive late, short-counted or not as ordered.",
  "Today we focus on the basics done well. Every bag of cement is counted, every bundle of rods checked against the order before it leaves. Materials are sourced from authorised dealers and verified distributors, so what arrives at your gate matches what you approved.",
  "We share a quote on WhatsApp within 24 hours, we deliver to all 16 regions and every load is insured until it is signed for at your site.",
  "From a single project in Accra to sites across the country, our job stays the same: source verified materials, count every delivery and help contractors build without the guesswork.",
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
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="overflow-hidden rounded-2xl shadow-[0_24px_48px_-16px_rgba(13,61,26,0.4)]">
              <img
                src="https://picsum.photos/seed/bph-about/800/600"
                alt="Packed building materials ready for delivery across Ghana"
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
