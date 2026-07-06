import type React from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  num: string;
  title: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}

/** Numbered instrument panel: hairline border, quiet header, ember index. */
export function ChartCard({ num, title, note, className, children }: ChartCardProps) {
  return (
    <section
      className={cn(
        "group relative flex flex-col rounded-lg border border-border bg-card/70 p-5",
        "transition-colors duration-300 hover:border-primary/40",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground">
          <span aria-hidden className="mr-2 text-primary">
            {num}
          </span>
          {title}
        </h2>
        {note ? (
          <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {note}
          </span>
        ) : null}
      </header>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
