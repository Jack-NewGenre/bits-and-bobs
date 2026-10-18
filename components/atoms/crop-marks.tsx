import { cn } from "@/lib/utils";

interface CropMarksProps {
  className?: string;
}

const CORNER = "border-mat-guide absolute size-3";

/** Printer's crop marks just outside each corner. The parent must be positioned. */
export function CropMarks({ className }: CropMarksProps) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute -inset-1.5", className)}
    >
      <span className={cn(CORNER, "top-0 left-0 border-t border-l")} />
      <span className={cn(CORNER, "top-0 right-0 border-t border-r")} />
      <span className={cn(CORNER, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(CORNER, "right-0 bottom-0 border-r border-b")} />
    </span>
  );
}

export type { CropMarksProps };
