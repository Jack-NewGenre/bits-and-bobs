"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface SidebarToolLinkProps {
  name: string;
  /** Rendered by the server, so the icon set stays out of the client bundle. */
  icon: ReactNode;
  /** Absent for a tool on the roadmap, which has no page to link to. */
  href?: string;
}

/**
 * One row of the sidebar. The list itself is rendered on the server; only this
 * leaf runs in the browser, because only the current route and the collapsed
 * state are things the server cannot know.
 */
export function SidebarToolLink({ name, icon, href }: SidebarToolLinkProps) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();

  // A tooltip is only reachable once the labels are hidden. Passing one while
  // the sidebar is open would mount a Radix tooltip per row, on every page, to
  // show nothing.
  const tooltip = state === "collapsed" && !isMobile;

  if (!href) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          tooltip={tooltip ? `${name} (coming soon)` : undefined}
        >
          {icon}
          <span>{name}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge>Soon</SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === href}
        tooltip={tooltip ? name : undefined}
      >
        <Link href={href}>
          {icon}
          <span>{name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
