"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TextPaneProps {
  label: string;
  /** Shown to the right of the label: a count, a status, an action. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A labelled panel with something in it, one half of a text tool. */
export function TextPane({ label, aside, children, className }: TextPaneProps) {
  return (
    <Card className={className}>
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex min-h-8 items-center justify-between gap-2">
          <Label className="text-xs">{label}</Label>
          {aside}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

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

/** Two panes side by side on a wide screen, stacked on a narrow one. */
export function TwoPane({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-2">{children}</div>;
}
