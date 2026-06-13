import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { ImageEnhancerTool } from "@/components/tools/image-enhancer/image-enhancer-tool";

const tool = getToolBySlug("image-enhancer");

export const metadata: Metadata = {
  title: `${tool?.name ?? "Image Enhancer"} — Toolbox`,
  description: tool?.description,
};

export default function ImageEnhancerPage() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Upscale and sharpen low-quality images on your device. Nothing is uploaded — it is completely private and free."
    >
      <ImageEnhancerTool />
    </ToolPageShell>
  );
}
