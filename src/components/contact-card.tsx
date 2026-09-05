import type { ReactNode } from "react";

type ContactCardProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
};

export function ContactCard({ icon, title, children }: ContactCardProps) {
  return (
    <div className="flex h-full flex-col rounded-[16px] border border-primary/10 bg-surface-alt p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary text-accent">
          {icon}
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </div>
  );
}