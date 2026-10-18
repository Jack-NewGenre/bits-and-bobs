"use client";

import { useTheme } from "next-themes";

import { Toaster } from "@/components/ui/sonner";

/**
 * Sonner only knows light and dark, and colours nothing for any other theme
 * name, so the dark mats (dark, green, blue) are handed to it as "dark".
 */
export function SiteToaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme ? (resolvedTheme === "light" ? "light" : "dark") : "system";

  return <Toaster theme={theme} richColors position="bottom-right" />;
}
