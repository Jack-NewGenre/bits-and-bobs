import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getToolBySlug } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { PasswordTool } from "@/components/tools/password/password-tool";

const tool = getToolBySlug("password");

export const metadata: Metadata = {
  title: `${tool?.name ?? "Password Generator"} — Toolbox`,
  description: tool?.description,
};

export default function PasswordPage() {
  if (!tool) notFound();

  return (
    <ToolPageShell
      icon={tool.icon}
      title={tool.name}
      description="Create strong, random passwords with the Web Crypto API. Nothing leaves your device."
    >
      <PasswordTool />
    </ToolPageShell>
  );
}
