import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { Base64Tool } from "@/components/tools/base64/base64-tool";

const tool = getToolBySlug("base64");

export const metadata: Metadata = {
  title: `${tool?.name ?? "Base64 Encode / Decode"} — Toolbox`,
  description: tool?.description,
};

export default function Base64Page() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Encode and decode Base64, with full Unicode and URL-safe support. Runs entirely in your browser."
    >
      <Base64Tool />
    </ToolPageShell>
  );
}
