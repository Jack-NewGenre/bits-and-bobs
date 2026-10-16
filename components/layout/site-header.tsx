import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { CommandMenuButton } from "@/components/atoms/command-menu-button";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import { ThemePicker } from "@/components/molecules/theme-picker";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1" />
      <Link href="/" className="text-sm font-medium">
        {SITE_NAME}
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <CommandMenuButton />
        <Link
          href="/changelog"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Changelog
        </Link>
        <ThemePicker className="hidden md:flex" />
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
