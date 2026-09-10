import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { SectionHeading } from "@/components/section-heading";
import { QuoteBuilder } from "@/components/quote-builder";
import { CatalogProvider } from "@/lib/catalog-context";

export const metadata: Metadata = {
  title: "Get a Quote",
  description:
    "Build your building materials quote and send it to Banning Procurement Hub on WhatsApp. We confirm pricing and delivery within 24 hours.",
  robots: { index: true },
  alternates: { canonical: "/quote/" },
};

export default function QuotePage() {
  return (
    <>
      <section className="py-12 lg:py-28" aria-label="Request a quote">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <SectionHeading
            kicker="Request a Quote"
            title="Get a Quote"
            description="Pick your materials, add your details and send the quote straight to us on WhatsApp. We confirm pricing and delivery within 24 hours."
          />
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-muted">
            {siteConfig.responsePromise}
          </p>
          <div className="mt-10">
            <CatalogProvider>
              <QuoteBuilder />
            </CatalogProvider>
          </div>
        </div>
      </section>
    </>
  );
}
