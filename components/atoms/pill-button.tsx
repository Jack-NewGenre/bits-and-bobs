"use client";

import { cn } from "@/lib/utils";

interface PillButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaPressed?: boolean;
  disabled?: boolean;
  /** `sm` is a more compact pill, used for inline toggles like zoom levels. */
  size?: "default" | "sm";
  className?: string;
}

export function PillButton({
  active,
  onClick,
  children,
  ariaPressed,
  disabled,
  size = "default",
  className,
}: PillButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={ariaPressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "border text-xs font-medium transition-colors",
        size === "sm" ? "rounded-md px-2 py-0.5" : "rounded-lg p-2",
        active ? "border-primary bg-accent" : "hover:bg-accent/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
