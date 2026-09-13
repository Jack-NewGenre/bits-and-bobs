"use client";

import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

interface DownloadButtonProps {
  onClick: () => void;
  /** Swaps the icon for a spinner and blocks the click. */
  busy?: boolean;
  disabled?: boolean;
  /** Defaults to a plain "Download"; pass the format or a count where it helps. */
  label?: React.ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
}

/**
 * The save button every result panel ends with. Holding the busy state here
 * keeps the spinner, the icon and the disabled rule in one place rather than
 * repeated once per tool.
 */
export function DownloadButton({
  onClick,
  busy = false,
  disabled = false,
  label = "Download",
  variant,
  className,
}: DownloadButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      disabled={disabled || busy}
      className={cn("w-full", className)}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {label}
    </Button>
  );
}

export type { DownloadButtonProps };
