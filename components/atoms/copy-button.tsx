"use client";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  /** Text to copy, or a getter for it. */
  value: string | (() => string);
  label?: string;
  copiedLabel?: string;
  size?: "xs" | "sm" | "default";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
  /** Render an icon-only button. */
  iconOnly?: boolean;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  variant = "outline",
  className,
  disabled,
  iconOnly = false,
}: CopyButtonProps) {
  const { copied, copy } = useCopy();
  const Icon = copied ? Check : Copy;

  const handleClick = () => {
    const text = typeof value === "function" ? value() : value;
    if (!text) return;

    // Say so rather than doing nothing: a browser can refuse the clipboard,
    // and a button that silently fails looks like a broken button.
    void copy(text).then((ok) => {
      if (!ok) {
        toast.error("Your browser blocked the clipboard. Select and copy manually.");
      }
    });
  };

  return (
    <Button
      type="button"
      size={iconOnly ? "icon-sm" : size}
      variant={variant}
      className={cn(className)}
      disabled={disabled}
      onClick={handleClick}
      aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
    >
      <Icon className={cn(copied && "text-emerald-500")} />
      {!iconOnly && (copied ? copiedLabel : label)}
    </Button>
  );
}
