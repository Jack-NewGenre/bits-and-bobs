import { Star } from "lucide-react";

import { FEATURED_TOOLS } from "@/lib/tools";
import { ToolCard } from "@/components/molecules/tool-card";

export function FeaturedTools() {
  return (
    <section aria-labelledby="featured-tools-heading" className="mt-8">
      <div className="mb-4">
        <h2
          id="featured-tools-heading"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Star className="text-muted-foreground size-4" aria-hidden />
          Featured tools
        </h2>
        <p className="text-muted-foreground text-sm">
          The best place to start: the jobs you would usually pay for, done on
          your device.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_TOOLS.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} variant="featured" />
        ))}
      </div>
    </section>
  );
}
