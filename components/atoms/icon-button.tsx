"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Shown beside the label in the tooltip, e.g. "B" or "⌘Z". */
  shortcut?: string;
  /** For toggles and tool pickers: pressed when true. */
  active?: boolean;
  disabled?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  size?: "icon-xs" | "icon-sm" | "icon";
  className?: string;
}

/** A square icon button whose name appears in a tooltip, with its shortcut. */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  shortcut,
  active,
  disabled,
  side = "bottom",
  size = "icon-sm",
  className,
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size={size}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn(active && "text-foreground", className)}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut && <span className="opacity-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export type { IconButtonProps };
