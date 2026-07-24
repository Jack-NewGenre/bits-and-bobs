import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { PngToSvgTool } from "@/components/tools/png-to-svg/png-to-svg-tool";

const tool = getToolBySlug("png-to-svg");

export const metadata: Metadata = {
  title: `${tool?.name ?? "PNG to SVG"} — Toolbox`,
  description: tool?.description,
};

export default function PngToSvgPage() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Trace PNG, JPG or WebP images into infinitely scalable SVG vectors on your device. Nothing is uploaded — it is completely private and free."
    >
      <PngToSvgTool />
    </ToolPageShell>
  );
}
