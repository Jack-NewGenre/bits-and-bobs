import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

export type { TextPaneProps };
