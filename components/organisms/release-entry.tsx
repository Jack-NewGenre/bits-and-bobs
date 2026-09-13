import { CirclePlus, CircleMinus, PenLine, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { countChanges, splitChangeItem } from "@/lib/changelog";
import type { ChangeKind, Release } from "@/lib/changelog";
import { Badge } from "@/components/ui/badge";

const KIND_ICON: Record<ChangeKind, LucideIcon> = {
  Added: CirclePlus,
  Changed: PenLine,
  Fixed: Wrench,
  Removed: CircleMinus,
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** `2026-09-13` as `13 September 2026`, without dragging in a date library. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return DATE_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

export function ReleaseEntry({ release }: { release: Release }) {
  const changes = countChanges(release);

  return (
    <article className="border-border relative border-l pb-10 pl-6 last:pb-0 sm:pl-8">
      <span
        aria-hidden
        className="bg-primary ring-background absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-4"
      />

      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2
          id={`v${release.version}`}
          className="scroll-mt-20 text-xl font-semibold tracking-tight"
        >
          {release.version}
        </h2>
        <time
          dateTime={release.date}
          className="text-muted-foreground text-sm"
        >
          {formatDate(release.date)}
        </time>
        <Badge variant="secondary">
          {changes} {changes === 1 ? "change" : "changes"}
        </Badge>
      </header>

      {release.summary ? (
        <p className="text-muted-foreground mb-5 text-sm">{release.summary}</p>
      ) : null}

      <div className="space-y-5">
        {release.groups.map((group) => {
          const Icon = KIND_ICON[group.kind];

          return (
            <section key={group.kind}>
              <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <Icon className="size-3.5" />
                {group.kind}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const { label, text } = splitChangeItem(item);

                  return (
                    <li
                      key={item}
                      className="text-foreground/90 text-sm leading-relaxed"
                    >
                      {label ? (
                        <span className="text-foreground font-medium">
                          {label}
                          {text ? ": " : null}
                        </span>
                      ) : null}
                      {text}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
