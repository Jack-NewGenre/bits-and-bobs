"use client";

import { Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { useHydrated } from "@/hooks/use-client-seed";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/site";
import { MatSwatch } from "@/components/atoms/mat-swatch";
import { THEME_OPTIONS } from "@/components/atoms/theme-toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAT_THEMES: readonly string[] = THEMES;

interface ThemePickerProps {
  className?: string;
}

/** Every mat laid out as a swatch, so the themes are visible before anyone picks one. */
export function ThemePicker({ className }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <ToggleGroup
      type="single"
      aria-label="Theme"
      spacing={1}
      value={hydrated ? theme : undefined}
      onValueChange={(value) => value && setTheme(value)}
      className={className}
    >
      {THEME_OPTIONS.map(({ value, label }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={value}
              aria-label={`${label} theme`}
              className={cn(
                "size-8 min-w-8 rounded-lg p-0 aria-checked:bg-transparent hover:bg-transparent",
                "[&>span]:transition-transform hover:[&>span]:-translate-y-0.5",
                "aria-checked:[&>span]:ring-2 aria-checked:[&>span]:ring-ring aria-checked:[&>span]:ring-offset-2 aria-checked:[&>span]:ring-offset-background",
              )}
            >
              {MAT_THEMES.includes(value) ? (
                <MatSwatch theme={value} />
              ) : (
                <span className="text-muted-foreground grid size-6 place-items-center rounded-md ring-1 ring-current/30">
                  <Monitor className="size-3.5" />
                </span>
              )}
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}

export type { ThemePickerProps };
