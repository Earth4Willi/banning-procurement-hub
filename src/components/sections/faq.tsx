"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { faqs } from "@/lib/site";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

const lastUpdated = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 lg:py-28" aria-label="Frequently asked questions">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <SectionHeading
            kicker="Common questions"
            title="Questions every site manager asks"
            description={`Last updated ${lastUpdated}. Straight answers on quotes, delivery, payment and guarantees.`}
          />
        </Reveal>
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-primary/10 rounded-[16px] border border-primary/10 bg-surface-alt">
          {faqs.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.question}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-surface/60"
                  >
                    <span className="font-display text-base font-semibold text-ink">{faq.question}</span>
                    <CaretDown
                      weight="duotone"
                      size={18}
                      className={`shrink-0 text-ink-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${index}`}
                  className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}