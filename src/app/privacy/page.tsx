import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Banning Procurement Hub handles the information you share when you request a quote. Plain-language, honest and simple.",
};

const lastUpdated = "September 5, 2026";

export default function PrivacyPage() {
  return (
    <>
      <section className="py-20 lg:py-28" aria-label="Privacy policy">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Privacy policy
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Last updated: {lastUpdated}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-20 lg:pb-28" aria-label="Privacy policy details">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="max-w-[65ch] space-y-10">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">In short</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                This website does not use cookies, does not run analytics and does not store your
                personal information on this site. When you request a quote, your details go
                directly to us over WhatsApp so we can reply.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                What we collect
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                We only collect what you choose to type into a quote or message: your name,
                delivery area, contact details and the materials you need. We do not collect
                payment card details, location tracking or any data automatically while you browse.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                How we use it
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                We use the details you share to prepare a quote, confirm pricing and arrange
                delivery of your materials. We do not sell, rent or share your information with
                any third party for marketing.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                WhatsApp and third parties
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                Quote requests are sent over WhatsApp, which is operated by Meta. Any information
                you send through WhatsApp is handled according to WhatsApp&apos;s own privacy
                policy, and we encourage you to review it. For deliveries across Ghana we work
                with verified hauliers, who receive only the delivery details needed to complete
                your order.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Your choices
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                You can ask us at any time to correct or delete the information you have sent us,
                or to confirm what we hold. Just contact us and we will respond within a reasonable
                time.
              </p>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Contact us
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                Questions about this policy? Reach us at{" "}
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-primary-700 underline underline-offset-4 transition-colors hover:text-primary-500"
                >
                  {siteConfig.email}
                </a>{" "}
                or via WhatsApp on {siteConfig.phoneDisplay}. Our office serves all 16 regions of
                Ghana.
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
