"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_EXPORT,
  type ExportOptions,
} from "@/lib/image/editor/canvas-io";
import {
  ACCEPTED_TYPES,
  filesFromClipboard,
  partitionFiles,
} from "@/lib/image/file-intake";
import { isProjectFile, PROJECT_TYPES } from "@/lib/image/editor/project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHandedOffFiles } from "@/hooks/use-handed-off-files";
import { useImageEditor } from "@/hooks/use-image-editor";
import {
  EditorDock,
  type EditorPanel,
} from "@/components/organisms/tools/image-editor/editor-dock";
import { EditorMenuBar } from "@/components/organisms/tools/image-editor/editor-menu-bar";
import { EditorPanels } from "@/components/organisms/tools/image-editor/editor-panels";
import { EditorRuler } from "@/components/organisms/tools/image-editor/editor-ruler";
import { EmptyCanvasCard } from "@/components/organisms/tools/image-editor/empty-canvas-card";
import { CloneSourceMarker } from "@/components/organisms/tools/image-editor/clone-source-marker";
import { EyedropperLoupe } from "@/components/organisms/tools/image-editor/eyedropper-loupe";
import { ExportDialog } from "@/components/organisms/tools/image-editor/export-dialog";
import { NewCanvasForm } from "@/components/organisms/tools/image-editor/new-canvas-form";
import { LiquifyDialog } from "@/components/organisms/tools/image-editor/liquify-dialog";
import { ShortcutsDialog } from "@/components/organisms/tools/image-editor/shortcuts-dialog";

type EditorDialog = "new" | "export" | "shortcuts" | null;

/** Width of the floating panel column, and the dock's height, in pixels. */
const PANEL_COLUMN = 300;
const DOCK_HEIGHT = 72;

const DISCARD_PROMPT =
  "Replace this canvas? Anything not saved or exported is lost.";

/** A full-screen, layered image editor: paint, type, draw shapes, adjust and export. */
export function ImageEditorTool() {
  const hostRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const openInput = useRef<HTMLInputElement>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const [panels, setPanels] = useState<ReadonlySet<EditorPanel>>(
    () => new Set<EditorPanel>(["properties", "layers"]),
  );
  // Fitting the canvas leaves room for the floating panels and the dock.
  const fitInsets = {
    top: 0,
    left: 0,
    right: panels.size > 0 ? PANEL_COLUMN : 0,
    bottom: DOCK_HEIGHT,
  };
  const editor = useImageEditor(hostRef, backdropRef, fitInsets, () =>
    openInput.current?.click(),
  );
  const {
    doc,
    artboard,
    tool,
    style,
    setStyle,
    layers,
    addImages,
    openFile,
    project,
  } = editor;
  const [exportOptions, setExportOptions] =
    useState<ExportOptions>(DEFAULT_EXPORT);
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const hasLayers = layers.layers.length > 0;

  const togglePanel = (panel: EditorPanel) =>
    setPanels((current) => {
      const next = new Set(current);
      if (!next.delete(panel)) next.add(panel);
      return next;
    });

  const confirmDiscard = () => !hasLayers || window.confirm(DISCARD_PROMPT);

  const acceptImages = (files: File[]) =>
    partitionFiles(files, ACCEPTED_TYPES).accepted;

  /** Opens an image as a new document, or a saved project with its layers. */
  const openAny = (file: File) => {
    if (!confirmDiscard()) return;
    if (isProjectFile(file)) void project.openProjectFile(file);
    else void openFile(file);
  };

  useHandedOffFiles(
    useCallback(
      (files: File[]) => {
        const [image] = partitionFiles(files, ACCEPTED_TYPES).accepted;
        if (image) void openFile(image);
      },
      [openFile],
    ),
  );

  // A pasted image lands as a new layer.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = filesFromClipboard(event.clipboardData?.items);
      if (files.length === 0) return;
      event.preventDefault();
      void addImages(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImages]);

  return (
    <div className="bg-background flex h-dvh flex-col">
      <EditorMenuBar
        editor={editor}
        onNewCanvas={() => setDialog("new")}
        onOpen={() => openInput.current?.click()}
        onAddImage={() => addInput.current?.click()}
        onExport={() => setDialog("export")}
        onShortcuts={() => setDialog("shortcuts")}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[1.25rem_1fr] grid-rows-[1.25rem_1fr]">
        <div className="bg-card border-r border-b" aria-hidden />
        <EditorRuler
          orientation="horizontal"
          zoom={artboard?.zoom ?? 1}
          origin={artboard?.left ?? 0}
        />
        <EditorRuler
          orientation="vertical"
          zoom={artboard?.zoom ?? 1}
          origin={artboard?.top ?? 0}
        />

        <div
          className="bg-mat relative min-h-0 min-w-0 overflow-hidden"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const files = Array.from(event.dataTransfer.files);
            const saved = files.find(isProjectFile);
            if (saved) openAny(saved);
            else void addImages(acceptImages(files));
          }}
        >
          <div
            ref={backdropRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute shadow-md",
              doc.background === null && "bg-checkerboard",
            )}
          />
          <div ref={hostRef} className="absolute inset-0 touch-none" />
          <EyedropperLoupe loupe={editor.loupe} />
          <CloneSourceMarker at={editor.cloneMarker} />

          {!hasLayers && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{
                paddingRight: fitInsets.right,
                paddingBottom: fitInsets.bottom,
              }}
            >
              <EmptyCanvasCard
                onNewCanvas={() => setDialog("new")}
                onAddImage={() => addInput.current?.click()}
                onAddText={editor.addText}
                savedName={project.saved?.name}
                onRestore={() => void project.restoreSaved()}
                onDiscard={project.discardSaved}
              />
            </div>
          )}

          <EditorPanels editor={editor} open={panels} onClose={togglePanel} />

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <EditorDock
              tool={tool}
              onToolChange={editor.setTool}
              panels={panels}
              onTogglePanel={togglePanel}
              colour={style.brushColour}
              secondary={style.secondaryColour}
              onColoursChange={({ colour, secondary }) =>
                setStyle((current) => ({
                  ...current,
                  ...(colour && { fill: colour, brushColour: colour }),
                  ...(secondary && { secondaryColour: secondary }),
                }))
              }
            />
          </div>
        </div>
      </div>

      <input
        ref={openInput}
        type="file"
        accept={[...ACCEPTED_TYPES, ...PROJECT_TYPES].join(",")}
        hidden
        onChange={(event) => {
          const [file] = Array.from(event.target.files ?? []);
          if (file) openAny(file);
          event.target.value = "";
        }}
      />
      <input
        ref={addInput}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        hidden
        onChange={(event) => {
          void addImages(acceptImages(Array.from(event.target.files ?? [])));
          event.target.value = "";
        }}
      />

      <Dialog
        open={dialog === "new"}
        onOpenChange={(open) => setDialog(open ? "new" : null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New canvas</DialogTitle>
            <DialogDescription>
              Start again on a blank canvas.
            </DialogDescription>
          </DialogHeader>
          <NewCanvasForm
            onCreate={(next) => {
              if (!confirmDiscard()) return;
              editor.newDocument(next);
              setDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>
      <ExportDialog
        open={dialog === "export"}
        onOpenChange={(open) => setDialog(open ? "export" : null)}
        doc={doc}
        options={exportOptions}
        onOptionsChange={setExportOptions}
        onExport={() => void editor.exportImage(exportOptions)}
      />
      <LiquifyDialog
        source={editor.liquify.source}
        onOpenChange={(open) => !open && editor.liquify.close()}
        onApply={editor.liquify.apply}
      />
      <ShortcutsDialog
        open={dialog === "shortcuts"}
        onOpenChange={(open) => setDialog(open ? "shortcuts" : null)}
      />
    </div>
  );
}
