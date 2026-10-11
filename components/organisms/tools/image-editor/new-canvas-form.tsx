"use client";

import { useState } from "react";

import {
  clampDimension,
  DOCUMENT_PRESETS,
  MAX_DIMENSION,
  type EditorDocument,
} from "@/lib/image/editor/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/atoms/pill-button";

interface NewCanvasFormProps {
  onCreate: (doc: EditorDocument) => void;
}

/** Size and background for a new blank canvas, with common presets. */
export function NewCanvasForm({ onCreate }: NewCanvasFormProps) {
  // Held as typed, so clearing a field to retype it does not snap to 1.
  const [text, setText] = useState({ width: "1080", height: "1080" });
  const [transparent, setTransparent] = useState(false);
  const size = {
    width: clampDimension(Number(text.width)),
    height: clampDimension(Number(text.height)),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {DOCUMENT_PRESETS.map((preset) => (
          <PillButton
            key={preset.label}
            active={
              preset.width === size.width && preset.height === size.height
            }
            onClick={() =>
              setText({
                width: String(preset.width),
                height: String(preset.height),
              })
            }
          >
            {preset.label}
            <span className="text-muted-foreground block font-normal">
              {preset.width} × {preset.height}
            </span>
          </PillButton>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["width", "height"] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`new-${key}`} className="text-xs capitalize">
              {key}
            </Label>
            <Input
              id={`new-${key}`}
              type="number"
              min={1}
              max={MAX_DIMENSION}
              value={text[key]}
              onChange={(event) =>
                setText((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PillButton active={!transparent} onClick={() => setTransparent(false)}>
          White
        </PillButton>
        <PillButton active={transparent} onClick={() => setTransparent(true)}>
          Transparent
        </PillButton>
      </div>
      <Button
        className="w-full"
        onClick={() =>
          onCreate({ ...size, background: transparent ? null : "#ffffff" })
        }
      >
        Create canvas
      </Button>
    </div>
  );
}
