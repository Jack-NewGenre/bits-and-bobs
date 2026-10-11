"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface SiteChromeProps {
  /** Routes that take over the whole window, such as the image editor. */
  fullScreenPaths: readonly string[];
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}

/**
 * The sidebar and header around every page, except a full-screen tool, which
 * gets the whole window. The sidebar and header are passed in rather than
 * imported so they stay server components.
 */
export function SiteChrome({
  fullScreenPaths,
  sidebar,
  header,
  children,
}: SiteChromeProps) {
  const pathname = usePathname();

  if (fullScreenPaths.includes(pathname)) {
    return (
      <main id="main" className="h-dvh overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset>
        {header}
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
