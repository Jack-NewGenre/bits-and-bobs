"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { MatRuler } from "@/components/atoms/mat-ruler";
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
      {/*
       * Tucked 1px under the sidebar so the mat's first grid line and the
       * sidebar's edge share a pixel, rather than sitting side by side.
       */}
      <SidebarInset className="bg-mat md:-ml-px">
        {/*
         * The ruler printed along the mat's edges. It scrolls with the mat so
         * its ticks always land on the grid lines, and sits under the page,
         * so paper laid on it covers it. top-14 is the header's height.
         */}
        <div
          data-slot="mat-edge"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <MatRuler labels={40} className="top-14 left-0" />
          <MatRuler labels={200} vertical className="top-0 left-0" />
        </div>
        {header}
        <main id="main" className="relative flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
