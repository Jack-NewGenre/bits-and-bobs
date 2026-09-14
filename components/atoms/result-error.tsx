import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface ResultErrorProps {
  message: string;
  className?: string;
}

/**
 * Why the latest pass failed, shown where its output stats would be. Without
 * it a panel that has given up looks the same as one that simply has nothing
 * to show yet.
 */
export function ResultError({ message, className }: ResultErrorProps) {
  return (
    <p
      className={cn(
        "text-destructive flex items-start gap-2 text-xs",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}
