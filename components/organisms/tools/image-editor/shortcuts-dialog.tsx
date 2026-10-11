"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TOOL_GROUPS } from "@/components/organisms/tools/image-editor/editor-tools";
import { TOOL_KEYS } from "@/lib/image/editor/shortcuts";

type Shortcut = readonly [keys: string, action: string];

const TOOLS: readonly Shortcut[] = [
  ...TOOL_GROUPS.flat().map((info): Shortcut => [
    TOOL_KEYS[info.tool],
    info.label,
  ]),
  ["Space", "Pan while held"],
  ["⇧M  ⇧L  ⇧O", "Switch marquee, lasso, dodge/burn"],
];

const GROUPS: readonly { title: string; keys: readonly Shortcut[] }[] = [
  { title: "Tools", keys: TOOLS },
  {
    title: "Painting",
    keys: [
      ["[  ]", "Brush size"],
      ["⇧[  ⇧]", "Brush hardness"],
      ["1 … 0", "Opacity 10–100%"],
      ["D", "Default colours"],
      ["X", "Swap colours"],
      ["⌥⌫", "Fill with colour"],
      ["⌘⌫", "Fill with second colour"],
    ],
  },
  {
    title: "Edit",
    keys: [
      ["⌘Z", "Undo"],
      ["⇧⌘Z", "Redo"],
      ["⌘J", "Duplicate layer"],
      ["⌫", "Delete, or clear selection"],
      ["Arrows", "Nudge (shift for 10px)"],
      ["⌘S", "Save project"],
      ["⌘O", "Open"],
    ],
  },
  {
    title: "Select",
    keys: [
      ["⌘A", "All"],
      ["⌘D", "Deselect"],
      ["⇧⌘D", "Reselect"],
      ["⇧⌘I", "Inverse"],
      ["⌥⌘A", "All layers"],
      ["Esc", "Deselect"],
    ],
  },
  {
    title: "Layer",
    keys: [
      ["⌘[  ⌘]", "Send backward, bring forward"],
      ["⇧⌘[  ⇧⌘]", "Send to back, bring to front"],
      ["⌥[  ⌥]", "Select layer below, above"],
      ["⌥⌘G", "Clipping mask"],
    ],
  },
  {
    title: "View",
    keys: [
      ["⌘+  ⌘−", "Zoom in, out"],
      ["⌘0", "Fit to screen"],
      ["⌘1", "Actual size"],
      ["⌘ scroll", "Zoom at the pointer"],
      ["⇧⌘;", "Smart guides"],
    ],
  },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Photoshop&apos;s shortcuts. On Windows and Linux, use Ctrl for ⌘ and
            Alt for ⌥.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-xs font-medium">{group.title}</h3>
              <dl className="space-y-1.5 text-xs">
                {group.keys.map(([key, action]) => (
                  <div
                    key={action}
                    className="flex items-center justify-between gap-2"
                  >
                    <dt className="text-muted-foreground">{action}</dt>
                    <dd>
                      <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap">
                        {key}
                      </kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
