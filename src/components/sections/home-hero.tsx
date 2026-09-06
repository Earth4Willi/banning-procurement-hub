import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { stats } from "@/lib/site";

const sameDay = stats.find((stat) => stat.value.toLowerCase().includes("same")) ?? stats[stats.length - 1];

export function HomeHero() {
  return (
    <section
      className="relative flex min-h-[100dvh] items-center overflow-hidden py-20"
      aria-label="Introduction"
    >
      <img
        src="/hero.jpg"
        alt=""
        aria-hidden
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#0a2410]/95 via-[#0a2410]/70 to-[#0a2410]/30"
      />
      <div className="relative mx-auto w-full max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-light">
            Construction materials, delivered across Ghana
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">
            Materials for your next build, delivered on time.
          </h1>
          <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-white/85 md:text-lg">
            Cement, rods, tiles, roofing, plumbing and electricals supplied and delivered across all
            16 regions of Ghana.
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
              className="rounded-[10px] border border-white/70 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-primary active:scale-[0.98]"
            >
              Browse Materials
            </Link>
          </div>
        </Reveal>
      </div>
      <div className="absolute bottom-8 right-4 rounded-[16px] border border-primary/10 bg-surface p-4 shadow-[0_12px_24px_-8px_rgba(13,61,26,0.35)] md:right-6">
        <p className="font-mono text-sm font-semibold uppercase tracking-wider text-primary">
          {sameDay.value}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{sameDay.label}</p>
      </div>
    </section>
  );
}
