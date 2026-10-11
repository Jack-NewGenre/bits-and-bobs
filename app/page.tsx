import { ShieldCheck, Sparkles, Zap } from "lucide-react";

import { SITE_NAME } from "@/lib/site";
import { TOOL_CATEGORIES, getToolsByCategory } from "@/lib/tools";
import { Mascot } from "@/components/atoms/mascot";
import { ToolCard } from "@/components/molecules/tool-card";
import { FeaturedTools } from "@/components/organisms/featured-tools";
import { ToolSearch } from "@/components/organisms/tool-search";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Private by default",
    description:
      "Everything runs in your browser. Files never leave your device.",
  },
  {
    icon: Zap,
    title: "No accounts, no fees",
    description: "Free alternatives to the paid online tools you reach for.",
  },
  {
    icon: Sparkles,
    title: "Clean and fast",
    description: "A focused, app-style workspace for getting things done.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="mb-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <Mascot />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{SITE_NAME}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-base">
              A growing set of clean, fast utilities that run entirely in your
              browser. No uploads, no sign-up, no cost.
            </p>
          </div>
        </div>
        <ToolSearch>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-card flex items-start gap-3 rounded-xl border p-4"
              >
                <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <FeaturedTools />

          <div className="mt-10 space-y-10">
            {TOOL_CATEGORIES.map((category) => (
              <section key={category.id}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {category.name}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {category.description}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {getToolsByCategory(category.id).map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ToolSearch>
      </section>
    </div>
  );
}
