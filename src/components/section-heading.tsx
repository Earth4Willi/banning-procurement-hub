type Props = {
  title: string;
  kicker?: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({ title, kicker, description, align = "left" }: Props) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {kicker ? (
        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">{kicker}</p>
      ) : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h2>
      {description ? (
        <p className={align === "center" ? "mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted" : "mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted"}>
          {description}
        </p>
      ) : null}
    </div>
  );
}