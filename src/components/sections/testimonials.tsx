import { testimonials } from "@/lib/site";
import { QuotationMark } from "@/components/quotation-mark";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

export function Testimonials() {
  return (
    <section className="py-24 lg:py-28" aria-label="Testimonials">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <SectionHeading kicker="Client words" title="Builders who came back for the next block" align="center" />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.08}>
              <figure className="flex h-full flex-col rounded-[16px] bg-surface-alt p-6">
                <QuotationMark className="h-7 w-7 text-accent" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">{testimonial.quote}</blockquote>
                <figcaption className="mt-6 border-t border-primary/10 pt-4">
                  <p className="font-display text-sm font-semibold text-ink">{testimonial.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{testimonial.role}</p>
                  <p className="text-xs text-ink-muted">{testimonial.company}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}