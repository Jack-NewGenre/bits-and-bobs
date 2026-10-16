import Image from "next/image";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { TOOL_CATEGORIES, getToolsByCategory } from "@/lib/tools";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarToolLink } from "@/components/layout/sidebar-tool-link";

/**
 * A server component on purpose. The catalogue is 27 entries, each carrying an
 * icon component and a page blurb the sidebar never shows; rendering it here
 * keeps all of that out of the JavaScript every page has to download. Only
 * `SidebarToolLink` crosses into the browser.
 */
export function AppSidebar() {
  // Above the sticky header (also z-10), which overlaps the sidebar's edge by 1px.
  return (
    <Sidebar className="z-20">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <Image
                  src="/logo.png"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0"
                />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{SITE_NAME}</span>
                  <span className="text-muted-foreground text-xs">
                    Free local tools
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {TOOL_CATEGORIES.map((category) => (
          <SidebarGroup key={category.id}>
            <SidebarGroupLabel>{category.name}</SidebarGroupLabel>
            <SidebarMenu>
              {getToolsByCategory(category.id).map((tool) => (
                <SidebarToolLink
                  key={tool.slug}
                  name={tool.name}
                  href={tool.href}
                  icon={<tool.icon />}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
