"use client";

import { Fragment } from "react";
import {
  Frame,
  Layers,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TOOL_KEYS, type EditorTool } from "@/lib/image/editor/shortcuts";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconButton } from "@/components/atoms/icon-button";
import { ColourPair } from "@/components/organisms/tools/image-editor/colour-pair";
import { TOOL_GROUPS } from "@/components/organisms/tools/image-editor/editor-tools";

export type EditorPanel = "properties" | "layers" | "canvas";

const PANELS: readonly {
  panel: EditorPanel;
  label: string;
  icon: LucideIcon;
}[] = [
  { panel: "properties", label: "Properties", icon: SlidersHorizontal },
  { panel: "layers", label: "Layers", icon: Layers },
  { panel: "canvas", label: "Canvas", icon: Frame },
];

interface EditorDockProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  panels: ReadonlySet<EditorPanel>;
  onTogglePanel: (panel: EditorPanel) => void;
  colour: string;
  secondary: string;
  onColoursChange: (patch: { colour?: string; secondary?: string }) => void;
}

/**
 * The floating dock along the bottom of the workspace: tools with their
 * shortcut letters, the panel switches and the two colours.
 */
export function EditorDock({
  tool,
  onToolChange,
  panels,
  onTogglePanel,
  colour,
  secondary,
  onColoursChange,
}: EditorDockProps) {
  return (
    <div className="bg-card/95 supports-[backdrop-filter]:bg-card/80 pointer-events-auto flex items-center gap-1 rounded-xl border p-1 shadow-lg backdrop-blur">
      <div
        role="toolbar"
        aria-label="Tools"
        className="flex items-center gap-0.5"
      >
        {TOOL_GROUPS.map((group, index) => (
          <Fragment key={group[0].tool}>
            {index > 0 && (
              <Separator orientation="vertical" className="mx-0.5 h-6" />
            )}
            {group.map((item) => {
              const active = tool === item.tool;
              return (
                <Tooltip key={item.tool}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-pressed={active}
                      onClick={() => onToolChange(item.tool)}
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-lg transition-colors",
                        "focus-visible:ring-ring outline-none focus-visible:ring-2",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4" />
                      <span className="absolute right-1 bottom-0.5 font-mono text-[8px] leading-none opacity-70">
                        {TOOL_KEYS[item.tool]}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {item.label}
                    <span className="opacity-60">{TOOL_KEYS[item.tool]}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </Fragment>
        ))}
      </div>
      <Separator orientation="vertical" className="mx-1 h-6" />
      {PANELS.map((item) => (
        <IconButton
          key={item.panel}
          icon={item.icon}
          label={`${panels.has(item.panel) ? "Hide" : "Show"} ${item.label.toLowerCase()}`}
          active={panels.has(item.panel)}
          side="top"
          size="icon"
          onClick={() => onTogglePanel(item.panel)}
        />
      ))}
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ColourPair
        colour={colour}
        secondary={secondary}
        onChange={onColoursChange}
      />
    </div>
  );
}
