import type { EditorAction } from "@/lib/image/editor/shortcuts";
import type { ImageEditor } from "@/hooks/use-image-editor";

export interface MenuItem {
  label: string;
  shortcut?: string;
  run: () => void;
  disabled?: boolean;
  /** Shown with a tick when on. */
  checked?: boolean;
}

export interface Menu {
  label: string;
  groups: MenuItem[][];
}

export interface MenuHandlers {
  onNewCanvas: () => void;
  onOpen: () => void;
  onAddImage: () => void;
  onExport: () => void;
  onShortcuts: () => void;
}

/** The application menus, Photoshop's layout cut down to what the editor does. */
export function buildMenus(
  editor: ImageEditor,
  handlers: MenuHandlers,
): Menu[] {
  const { history, layers, selection, masks, project } = editor;
  const act = (action: EditorAction) => () => editor.runAction(action);
  const hasLayer = layers.layers.some((layer) => layer.selected);
  const one = layers.selection;
  const pixels = selection.selection !== null;

  return [
    {
      label: "File",
      groups: [
        [
          { label: "New canvas…", run: handlers.onNewCanvas },
          { label: "Open…", shortcut: "⌘O", run: handlers.onOpen },
          { label: "Add image as layer…", run: handlers.onAddImage },
        ],
        [
          {
            label: "Save project",
            shortcut: "⌘S",
            run: () => void project.saveFile(),
          },
          { label: "Export…", run: handlers.onExport },
        ],
      ],
    },
    {
      label: "Edit",
      groups: [
        [
          {
            label: "Undo",
            shortcut: "⌘Z",
            run: act({ type: "undo" }),
            disabled: !history.canUndo,
          },
          {
            label: "Redo",
            shortcut: "⇧⌘Z",
            run: act({ type: "redo" }),
            disabled: !history.canRedo,
          },
        ],
        [
          {
            label: "Duplicate",
            shortcut: "⌘J",
            run: act({ type: "duplicate" }),
            disabled: !hasLayer,
          },
          {
            label: pixels ? "Clear selected pixels" : "Delete",
            shortcut: "⌫",
            run: act({ type: "delete" }),
            disabled: !hasLayer,
          },
        ],
        [
          {
            label: "Content-aware fill",
            run: () => void editor.contentAwareFill(),
            disabled: !pixels || !one,
          },
        ],
        [{ label: "Crop to selection or content", run: editor.cropToContent }],
      ],
    },
    {
      label: "Layer",
      groups: [
        [
          { label: "New layer", run: layers.createLayer },
          {
            label: "Select all layers",
            shortcut: "⌥⌘A",
            run: layers.selectAll,
          },
        ],
        [
          {
            label: pixels ? "Mask to selection" : "Add layer mask",
            run: () => void masks.addMask(),
            disabled: !one || one.masked,
          },
          {
            label: "Apply layer mask",
            run: () => void masks.applyMask(),
            disabled: !one?.masked,
          },
          {
            label: "Delete layer mask",
            run: () => void masks.deleteMask(),
            disabled: !one?.masked,
          },
          {
            label: "Clipping mask",
            shortcut: "⌥⌘G",
            run: () => void masks.toggleClipping(),
            disabled: !one,
            checked: Boolean(one?.clipped),
          },
        ],
      ],
    },
    {
      label: "Filter",
      groups: [
        [{ label: "Liquify…", run: editor.liquify.open, disabled: !one }],
      ],
    },
    {
      label: "Select",
      groups: [
        [
          { label: "All", shortcut: "⌘A", run: selection.selectAll },
          {
            label: "Deselect",
            shortcut: "⌘D",
            run: selection.deselect,
            disabled: !pixels,
          },
          {
            label: "Reselect",
            shortcut: "⇧⌘D",
            run: selection.reselect,
            disabled: pixels,
          },
          { label: "Inverse", shortcut: "⇧⌘I", run: selection.invert },
        ],
      ],
    },
    {
      label: "View",
      groups: [
        [
          { label: "Zoom in", shortcut: "⌘+", run: act({ type: "zoom-in" }) },
          { label: "Zoom out", shortcut: "⌘−", run: act({ type: "zoom-out" }) },
        ],
        [
          {
            label: "Fit to screen",
            shortcut: "⌘0",
            run: act({ type: "zoom-fit" }),
          },
          {
            label: "Actual size",
            shortcut: "⌘1",
            run: act({ type: "zoom-actual" }),
          },
        ],
        [
          {
            label: "Smart guides",
            shortcut: "⇧⌘;",
            run: () => editor.setSnapping((on) => !on),
            checked: editor.snapping,
          },
        ],
      ],
    },
    {
      label: "Help",
      groups: [[{ label: "Keyboard shortcuts", run: handlers.onShortcuts }]],
    },
  ];
}
