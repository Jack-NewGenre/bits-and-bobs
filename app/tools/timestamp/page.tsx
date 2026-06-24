import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { TimestampTool } from "@/components/tools/timestamp/timestamp-tool";

const tool = getToolBySlug("timestamp");

export const metadata: Metadata = {
  title: `${tool?.name ?? "Timestamp Converter"} — Toolbox`,
  description: tool?.description,
};

export default function TimestampPage() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Convert between Unix timestamps and human-readable dates, in your local time zone."
    >
      <TimestampTool />
    </ToolPageShell>
  );
}
