import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { UuidTool } from "@/components/tools/uuid/uuid-tool";

const tool = getToolBySlug("uuid");

export const metadata: Metadata = {
  title: `${tool?.name ?? "UUID Generator"} — Toolbox`,
  description: tool?.description,
};

export default function UuidPage() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Generate RFC 4122 version 4 UUIDs in bulk. Everything happens in your browser."
    >
      <UuidTool />
    </ToolPageShell>
  );
}
