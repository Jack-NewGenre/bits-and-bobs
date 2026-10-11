"use client";

import { Separator } from "@/components/ui/separator";
import { AdjustmentsPanel } from "@/components/organisms/tools/image-editor/adjustments-panel";
import { CanvasPanel } from "@/components/organisms/tools/image-editor/canvas-panel";
import type { EditorPanel } from "@/components/organisms/tools/image-editor/editor-dock";
import { FloatingPanel } from "@/components/organisms/tools/image-editor/floating-panel";
import { LayerStylesPanel } from "@/components/organisms/tools/image-editor/layer-styles-panel";
import { LayersPanel } from "@/components/organisms/tools/image-editor/layers-panel";
import { MaskPanel } from "@/components/organisms/tools/image-editor/mask-panel";
import { PropertiesPanel } from "@/components/organisms/tools/image-editor/properties-panel";
import { ToolOptionsPanel } from "@/components/organisms/tools/image-editor/tool-options-panel";
import type { ImageEditor } from "@/hooks/use-image-editor";

interface EditorPanelsProps {
  editor: ImageEditor;
  open: ReadonlySet<EditorPanel>;
  onClose: (panel: EditorPanel) => void;
}

/**
 * The floating palettes down the right of the workspace. Properties follows
 * what is in hand: the active tool's settings while drawing, otherwise the
 * selected layer, with adjustments for an image.
 */
export function EditorPanels({ editor, open, onClose }: EditorPanelsProps) {
  const { layers, doc, tool, masks } = editor;
  const { selection } = layers;
  const showToolOptions = tool !== "select" && tool !== "hand";

  return (
    <div className="pointer-events-none absolute top-3 right-3 bottom-20 flex w-72 flex-col gap-3">
      {open.has("properties") && (
        <FloatingPanel
          title="Properties"
          onClose={() => onClose("properties")}
          className="max-h-[55%] shrink"
        >
          {showToolOptions ? (
            <ToolOptionsPanel editor={editor} />
          ) : selection ? (
            <>
              <PropertiesPanel
                selection={selection}
                onStyle={layers.updateStyle}
                onTransform={layers.transform}
              />
              <Separator />
              <MaskPanel
                masked={selection.masked}
                clipped={selection.clipped}
                fromSelection={editor.selection.selection !== null}
                onAddMask={() => void masks.addMask()}
                onApplyMask={() => void masks.applyMask()}
                onDeleteMask={() => void masks.deleteMask()}
                onToggleClipping={() => void masks.toggleClipping()}
              />
              {selection.adjustments && (
                <>
                  <Separator />
                  <AdjustmentsPanel
                    adjustments={selection.adjustments}
                    onChange={layers.setAdjustments}
                  />
                </>
              )}
              {selection.layerStyles && (
                <>
                  <Separator />
                  <LayerStylesPanel
                    styles={selection.layerStyles}
                    onChange={layers.setLayerStyles}
                  />
                </>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Select a layer to change it, or pick a tool from the dock.
            </p>
          )}
        </FloatingPanel>
      )}
      {open.has("layers") && (
        <FloatingPanel
          title="Layers"
          meta={layers.layers.length}
          onClose={() => onClose("layers")}
          className="min-h-40 shrink"
        >
          <LayersPanel
            layers={layers.layers}
            thumbnails={layers.thumbnails}
            onSelect={layers.selectLayer}
            onToggleVisible={layers.toggleVisible}
            onToggleLocked={layers.toggleLocked}
            onRename={layers.renameLayer}
            onMove={layers.moveLayer}
            onArrange={layers.arrange}
            onCreate={layers.createLayer}
            onDuplicate={() => void layers.duplicateSelected()}
            onDelete={layers.removeSelected}
          />
        </FloatingPanel>
      )}
      {open.has("canvas") && (
        <FloatingPanel
          title="Canvas"
          meta={`${doc.width} × ${doc.height}`}
          onClose={() => onClose("canvas")}
          className="shrink-0"
        >
          <CanvasPanel
            doc={doc}
            onDocumentChange={editor.updateDocument}
            onCropToContent={editor.cropToContent}
          />
        </FloatingPanel>
      )}
    </div>
  );
}
