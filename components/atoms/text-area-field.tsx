"use client";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface TextAreaFieldProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  ariaLabel: string;
  className?: string;
}

/** The monospaced field every text tool reads from or writes to. */
export function TextAreaField({
  value,
  onChange,
  placeholder,
  readOnly,
  ariaLabel,
  className,
}: TextAreaFieldProps) {
  return (
    <Textarea
      value={value}
      readOnly={readOnly}
      aria-label={ariaLabel}
      spellCheck={false}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      className={cn("min-h-72 flex-1 resize-y font-mono text-sm", className)}
    />
  );
}

export type { TextAreaFieldProps };
