import Link from "next/link";
import { Wrench } from "lucide-react";

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
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Wrench className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Toolbox</span>
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
