"use client";

import { BRUSH_TOOLS, SELECTION_TOOLS } from "@/lib/image/editor/shortcuts";
import type { ToolStyle } from "@/lib/image/editor/tool-style";
import { Button } from "@/components/ui/button";
import { OptionGroup } from "@/components/molecules/option-group";
import { BrushOptions } from "@/components/organisms/tools/image-editor/brush-options";
import { TOOL_INFO } from "@/components/organisms/tools/image-editor/editor-tools";
import { SelectionOptions } from "@/components/organisms/tools/image-editor/selection-options";
import { ShapeOptions } from "@/components/organisms/tools/image-editor/shape-options";
import type { ImageEditor } from "@/hooks/use-image-editor";

const PAINTS = new Set([...BRUSH_TOOLS, "fill", "gradient"]);

const PAINT_TARGETS = [
  { value: "layer", label: "Layer" },
  { value: "mask", label: "Mask" },
] as const;

interface ToolOptionsPanelProps {
  editor: ImageEditor;
}

/** Settings for the active tool, and what it will work on. */
export function ToolOptionsPanel({ editor }: ToolOptionsPanelProps) {
  const { tool, style, setStyle, selection, masks, layers } = editor;
  const info = TOOL_INFO[tool];
  const onChange = (patch: Partial<ToolStyle>) =>
    setStyle((current) => ({ ...current, ...patch }));
  const masked = Boolean(layers.selection?.masked);
  const maskable = masked && (tool === "brush" || tool === "eraser");

  return (
    <section aria-label={`${info.label} options`} className="space-y-4">
      <div>
        <h2 className="text-xs font-medium">{info.label}</h2>
        <p className="text-muted-foreground mt-1 text-xs">{info.hint}</p>
      </div>
      {maskable && (
        <OptionGroup
          label="Paint on"
          choices={PAINT_TARGETS}
          value={masks.editingMask ? "mask" : "layer"}
          onChange={(target) => masks.setEditingMask(target === "mask")}
          hint={
            masks.editingMask
              ? "The brush shows the layer, the eraser hides it."
              : undefined
          }
        />
      )}
      {SELECTION_TOOLS.has(tool) && (
        <SelectionOptions
          tool={tool}
          style={style}
          onChange={onChange}
          hasSelection={selection.selection !== null}
          onSelectAll={selection.selectAll}
          onInvert={selection.invert}
          onDeselect={selection.deselect}
        />
      )}
      {PAINTS.has(tool) && (
        <BrushOptions tool={tool} style={style} onChange={onChange} />
      )}
      {(tool === "shape" || tool === "text") && (
        <ShapeOptions tool={tool} style={style} onChange={onChange} />
      )}
      {tool === "crop" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={editor.cropToContent}
        >
          Crop to selection or content
        </Button>
      )}
    </section>
  );
}
