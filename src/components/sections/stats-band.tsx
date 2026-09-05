import { stats } from "@/lib/site";

export function StatsBand() {
  return (
    <section className="bg-[#0d3d1a]" aria-label="Company stats">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 py-16 sm:grid-cols-2 md:grid-cols-4 md:gap-0 md:divide-x md:divide-white/15 md:px-6 lg:py-20">
        {stats.map((stat) => (
          <div key={stat.label} className="md:px-8">
            <p className="font-mono text-2xl font-semibold text-accent md:text-3xl">{stat.value}</p>
            <p className="mt-1.5 text-sm text-white/80">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}