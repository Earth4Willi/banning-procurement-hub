import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { stats } from "@/lib/site";

const sameDay = stats.find((stat) => stat.value.toLowerCase().includes("same")) ?? stats[stats.length - 1];

export function HomeHero() {
  return (
    <section className="flex min-h-[100dvh] items-center py-20" aria-label="Introduction">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-14 px-4 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Construction materials, delivered across Ghana
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl lg:text-6xl">
              Materials for your next build,<br className="hidden sm:block" /> delivered on time.
            </h1>
            <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Cement, rods, tiles, roofing, plumbing and electricals supplied and delivered across all 16 regions
              of Ghana.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/quote"
                className="rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
              >
                Get a Quote
              </Link>
              <Link
                href="/products"
                className="rounded-[10px] border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white active:scale-[0.98]"
              >
                Browse Materials
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="relative">
          <div className="overflow-hidden rounded-2xl shadow-[0_24px_48px_-16px_rgba(13,61,26,0.4)]">
            <img
              src="https://picsum.photos/seed/bph-hero/800/600"
              alt="Building materials ready for delivery in Accra"
              width={800}
              height={600}
              fetchPriority="high"
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-6 rounded-[16px] border border-primary/10 bg-surface p-4 shadow-[0_12px_24px_-8px_rgba(13,61,26,0.35)]">
            <p className="font-mono text-sm font-semibold uppercase tracking-wider text-primary">{sameDay.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{sameDay.label}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}