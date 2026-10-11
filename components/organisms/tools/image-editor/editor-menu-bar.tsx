"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Layers,
  Maximize,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";

import type { EditorAction } from "@/lib/image/editor/shortcuts";
import { formatZoom } from "@/lib/image/editor/viewport";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { IconButton } from "@/components/atoms/icon-button";
import { buildMenus } from "@/components/organisms/tools/image-editor/editor-menus";
import { ThemeToggle } from "@/components/atoms/theme-toggle";
import type { ImageEditor } from "@/hooks/use-image-editor";

interface EditorMenuBarProps {
  editor: ImageEditor;
  onNewCanvas: () => void;
  onOpen: () => void;
  onAddImage: () => void;
  onExport: () => void;
  onShortcuts: () => void;
}

/** The application bar: menus, the document's name, history, zoom and export. */
export function EditorMenuBar({
  editor,
  onNewCanvas,
  onOpen,
  onAddImage,
  onExport,
  onShortcuts,
}: EditorMenuBarProps) {
  const { doc, name, history, artboard } = editor;
  const act = (action: EditorAction) => () => editor.runAction(action);

  const menus = buildMenus(editor, {
    onNewCanvas,
    onOpen,
    onAddImage,
    onExport,
    onShortcuts,
  });

  return (
    <header className="bg-card flex h-11 shrink-0 items-center gap-1 border-b px-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/" aria-label="Back to all tools">
          <ArrowLeft />
          <Layers />
          <span className="font-semibold">Photo Studio</span>
        </Link>
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <nav aria-label="Menus" className="flex">
        {menus.map((menu) => (
          <DropdownMenu key={menu.label}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="font-normal">
                {menu.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              {menu.groups.map((group, index) => (
                <div key={index}>
                  {index > 0 && <DropdownMenuSeparator />}
                  {group.map((item) =>
                    item.checked === undefined ? (
                      <DropdownMenuItem
                        key={item.label}
                        disabled={item.disabled}
                        onSelect={item.run}
                      >
                        {item.label}
                        {item.shortcut && (
                          <DropdownMenuShortcut>
                            {item.shortcut}
                          </DropdownMenuShortcut>
                        )}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuCheckboxItem
                        key={item.label}
                        disabled={item.disabled}
                        checked={item.checked}
                        onSelect={item.run}
                      >
                        {item.label}
                      </DropdownMenuCheckboxItem>
                    ),
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </nav>

      <div className="mx-auto hidden min-w-0 items-baseline gap-2 px-4 md:flex">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {doc.width} × {doc.height}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <IconButton
          icon={Undo2}
          label="Undo"
          shortcut="⌘Z"
          disabled={!history.canUndo}
          onClick={act({ type: "undo" })}
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          shortcut="⇧⌘Z"
          disabled={!history.canRedo}
          onClick={act({ type: "redo" })}
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <div className="flex items-center rounded-md border">
          <IconButton
            icon={Minus}
            label="Zoom out"
            shortcut="⌘−"
            size="icon-xs"
            onClick={act({ type: "zoom-out" })}
          />
          <button
            type="button"
            onClick={act({ type: "zoom-actual" })}
            aria-label="Zoom to 100%"
            className="hover:bg-muted h-6 w-12 text-center text-xs tabular-nums"
          >
            {artboard ? formatZoom(artboard.zoom) : "–"}
          </button>
          <IconButton
            icon={Plus}
            label="Zoom in"
            shortcut="⌘+"
            size="icon-xs"
            onClick={act({ type: "zoom-in" })}
          />
        </div>
        <IconButton
          icon={Maximize}
          label="Fit to screen"
          shortcut="⌘0"
          onClick={act({ type: "zoom-fit" })}
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button size="sm" onClick={onExport}>
          <Download />
          Export
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
