import { cn } from "@/lib/utils";

interface DimensionLineProps {
  label: string;
  className?: string;
}

/** A technical-drawing dimension: a bar, a line, the label, a line, a bar. */
export function DimensionLine({ label, className }: DimensionLineProps) {
  return (
    <div
      className={cn(
        "text-mat-ruler flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase",
        className,
      )}
    >
      <span aria-hidden className="h-3 w-px bg-current" />
      <span aria-hidden className="h-px flex-1 bg-current opacity-60" />
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-current opacity-60" />
      <span aria-hidden className="h-3 w-px bg-current" />
    </div>
  );
}

export type { DimensionLineProps };
