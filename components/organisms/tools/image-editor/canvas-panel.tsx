"use client";

import { Crop } from "lucide-react";

import {
  MAX_DIMENSION,
  type EditorDocument,
} from "@/lib/image/editor/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/atoms/pill-button";
import { HexColourField } from "@/components/organisms/tools/image-editor/hex-colour-field";

interface CanvasPanelProps {
  doc: EditorDocument;
  onDocumentChange: (patch: Partial<EditorDocument>) => void;
  onCropToContent: () => void;
}

/** Canvas size and background, and cropping. */
export function CanvasPanel({
  doc,
  onDocumentChange,
  onCropToContent,
}: CanvasPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["width", "height"] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`canvas-${key}`} className="text-xs capitalize">
              {key}
            </Label>
            <Input
              // Remounts when the size changes elsewhere (crop, undo).
              key={doc[key]}
              id={`canvas-${key}`}
              type="number"
              min={1}
              max={MAX_DIMENSION}
              defaultValue={doc[key]}
              onBlur={(event) =>
                onDocumentChange({ [key]: Number(event.target.value) })
              }
              onKeyDown={(event) =>
                event.key === "Enter" && event.currentTarget.blur()
              }
            />
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onCropToContent}
      >
        <Crop />
        Crop to selection or content
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <PillButton
          active={doc.background === null}
          onClick={() => onDocumentChange({ background: null })}
        >
          Transparent
        </PillButton>
        <PillButton
          active={doc.background !== null}
          onClick={() =>
            onDocumentChange({ background: doc.background ?? "#ffffff" })
          }
        >
          Solid colour
        </PillButton>
      </div>
      {doc.background !== null && (
        <HexColourField
          label="Background"
          value={doc.background}
          onChange={(background) => onDocumentChange({ background })}
        />
      )}
    </div>
  );
}
