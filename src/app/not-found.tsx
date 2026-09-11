import Link from "next/link";
import { Reveal } from "@/components/reveal";

export default function NotFound() {
  return (
    <section className="bg-[#0d3d1a] py-24 lg:py-32" aria-label="Page not found">
      <div className="mx-auto max-w-[1400px] px-4 text-center md:px-6">
        <Reveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Page not found
          </p>
          <p className="mt-6 font-mono text-6xl font-semibold tracking-tight text-accent md:text-8xl">
            404
          </p>
          <h1 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            This page hit a foundation issue
          </h1>
          <p className="mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-white/80">
            The page you are looking for does not exist or has moved.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
            >
              Back to Home
            </Link>
            <Link
              href="/products"
              className="inline-flex rounded-[10px] border border-white/25 px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5"
            >
              Browse Materials
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}