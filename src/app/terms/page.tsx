import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you request a quote, order and receive building materials from Banning Procurement Hub.",
};

const lastUpdated = "September 5, 2026";

export default function TermsPage() {
  return (
    <>
      <section className="py-20 lg:py-28" aria-label="Terms of service">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Terms of service
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Last updated: {lastUpdated}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-20 lg:pb-28" aria-label="Terms of service details">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="max-w-[65ch] space-y-10">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Our service
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                {siteConfig.name} sources and delivers construction and finishing materials across
                Ghana. We quote, confirm availability, supply and arrange delivery of the materials
                you choose. We are a procurement and supply company, not a construction contractor.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Quotes and pricing
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                Prices shown on this site are indicative samples and may change according to market
                rates, availability and delivery location. They are only confirmed when we provide
                you with a written quote. Unless stated otherwise, quotes are valid for 48 hours
                from the time we send them.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-muted">
                <li>Indicative prices are confirmed in writing before you order.</li>
                <li>Final pricing reflects the quantity, brand and delivery address agreed.</li>
                <li>Any change to a confirmed order may adjust the price.</li>
              </ul>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Orders and payment
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                An order is placed once we confirm your quote in writing and agree the quantities,
                delivery details and payment terms. We accept mobile money, bank transfer and cash
                on delivery. Payment terms are confirmed on your final invoice.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-muted">
                <li>Mobile money and bank transfers are confirmed before dispatch.</li>
                <li>Cash on delivery is settled when goods are received at your site.</li>
                <li>Prices are quoted in Ghanaian cedis unless agreed otherwise.</li>
              </ul>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Delivery
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                We deliver across all 16 regions of Ghana, with faster options in Greater Accra.
                Delivery dates are estimates shared at quote time. Please make sure someone is
                available to receive and sign for your goods on the agreed date.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-muted">
                <li>Count and check your materials before you sign.</li>
                <li>Report any shortage or damage to us as soon as you receive your order.</li>
                <li>Goods are insured in transit until signed for at your site.</li>
              </ul>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Guarantee and replacements
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                Every material is quality-checked before delivery. If you receive a genuine defect
                or a material that does not match your confirmed order, we will replace it or
                issue a refund for that item. {siteConfig.guarantee}
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Liability
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                To the extent permitted by law, our total liability for any order is limited to
                the amount you paid for the affected goods. We are not liable for any indirect
                or consequential loss, including delays on your construction programme, unless
                caused by our negligence. We are not responsible for how materials are used or
                installed on site.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Governing law
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                These terms are governed by the laws of the Republic of Ghana. Any dispute is
                subject to the jurisdiction of the courts of Ghana.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Contact us
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                For questions about these terms, contact us at{" "}
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-primary-700 underline underline-offset-4 transition-colors hover:text-primary-500"
                >
                  {siteConfig.email}
                </a>{" "}
                or via WhatsApp on {siteConfig.phoneDisplay}.
              </p>
            </Reveal>

            <Reveal>
              <Link
                href="/quote"
                className="mt-4 inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
              >
                Get a Quote
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
