"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { setCommandMenuOpen } from "@/hooks/use-command-menu";
import { useModifierKey } from "@/hooks/use-modifier-key";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

interface CommandMenuButtonProps {
  className?: string;
}

/** Opens the command menu, and advertises its shortcut while doing so. */
export function CommandMenuButton({ className }: CommandMenuButtonProps) {
  const modifier = useModifierKey();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCommandMenuOpen(true)}
      className={cn("text-muted-foreground font-normal sm:w-56 sm:justify-start", className)}
    >
      <Search />
      <span className="sr-only sm:not-sr-only">Search tools…</span>
      {modifier && (
        <KbdGroup className="ml-auto hidden sm:inline-flex">
          <Kbd>{modifier.trim()}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      )}
    </Button>
  );
}

export type { CommandMenuButtonProps };
