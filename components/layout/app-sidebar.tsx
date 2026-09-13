"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";

import { TOOL_CATEGORIES, getToolsByCategory, isAvailable } from "@/lib/tools";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();

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
              {getToolsByCategory(category.id).map((tool) => {
                if (!isAvailable(tool)) {
                  return (
                    <SidebarMenuItem key={tool.slug}>
                      <SidebarMenuButton
                        disabled
                        tooltip={`${tool.name} (coming soon)`}
                      >
                        <tool.icon />
                        <span>{tool.name}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>Soon</SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={tool.slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === tool.href}
                      tooltip={tool.name}
                    >
                      <Link href={tool.href}>
                        <tool.icon />
                        <span>{tool.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
