import type { RegexMatch } from "@/lib/text/regex";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/** Beyond this the list stops being readable and starts being a wall. */
const MAX_SHOWN = 20;

interface CaptureListProps {
  matches: RegexMatch[];
}

/** Each match with its position and whatever its groups captured. */
export function CaptureList({ matches }: CaptureListProps) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <Label className="text-xs">Captures</Label>
        <ul className="divide-border divide-y text-sm">
          {matches.slice(0, MAX_SHOWN).map((match, index) => (
            <li
              key={index}
              className="flex flex-wrap items-baseline gap-x-3 py-2"
            >
              <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
                at {match.index}
              </span>
              <code className="font-mono">{match.text}</code>
              {match.groups.map((group) => (
                <span
                  key={group.name}
                  className="text-muted-foreground text-xs"
                >
                  {group.name}:{" "}
                  <code className="font-mono">{group.value ?? "-"}</code>
                </span>
              ))}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export type { CaptureListProps };
