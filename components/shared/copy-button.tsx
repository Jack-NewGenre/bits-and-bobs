"use client";

import { Check, Copy } from "lucide-react";

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
    if (text) void copy(text);
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
