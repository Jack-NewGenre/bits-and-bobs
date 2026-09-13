import { cn } from "@/lib/utils";

interface TwoPaneProps {
  children: React.ReactNode;
  className?: string;
}

/** Two panes side by side on a wide screen, stacked on a narrow one. */
export function TwoPane({ children, className }: TwoPaneProps) {
  return <div className={cn("grid gap-6 lg:grid-cols-2", className)}>{children}</div>;
}

export type { TwoPaneProps };
