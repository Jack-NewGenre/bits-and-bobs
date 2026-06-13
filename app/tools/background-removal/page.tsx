import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { BackgroundRemovalTool } from "@/components/tools/background-removal/background-removal-tool";

const tool = getToolBySlug("background-removal");

export const metadata: Metadata = {
  title: `${tool?.name ?? "Background Remover"} — Toolbox`,
  description: tool?.description,
};

export default function BackgroundRemovalPage() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Upload an image and the background is removed on your device using AI. Nothing is uploaded — it is completely private and free."
    >
      <BackgroundRemovalTool />
    </ToolPageShell>
  );
}
