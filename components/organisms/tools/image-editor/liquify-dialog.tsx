"use client";

import { useRef, useState, type PointerEvent } from "react";

import type { LiquifyMode } from "@/lib/image/editor/liquify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";
import { useLiquify, type LiquifySource } from "@/hooks/use-liquify";

const MODES: readonly { value: LiquifyMode; label: string }[] = [
  { value: "forward", label: "Push" },
  { value: "twirl", label: "Twirl" },
  { value: "pucker", label: "Pucker" },
  { value: "bloat", label: "Bloat" },
  { value: "reconstruct", label: "Restore" },
];

const HINTS: Record<LiquifyMode, string> = {
  forward: "Drag to push pixels along.",
  twirl: "Hold to twirl clockwise. Hold Alt to twirl the other way.",
  pucker: "Hold to pull pixels towards the centre of the brush.",
  bloat: "Hold to push pixels out from the centre of the brush.",
  reconstruct: "Paint to undo the warp where you brush.",
};

interface LiquifyDialogProps {
  source: LiquifySource | null;
  onOpenChange: (open: boolean) => void;
  onApply: (result: HTMLCanvasElement) => void;
}

/** Photoshop's Liquify filter: push, twirl, pucker and bloat a layer's pixels with a brush. */
export function LiquifyDialog({
  source,
  onOpenChange,
  onApply,
}: LiquifyDialogProps) {
  const [mode, setMode] = useState<LiquifyMode>("forward");
  const [size, setSize] = useState(80);
  const [pressure, setPressure] = useState(50);
  const ring = useRef<HTMLDivElement>(null);
  const { preview, handlers, reset, result, changed } = useLiquify(source, {
    mode,
    size,
    pressure,
  });

  /** Keeps the brush ring on the pointer without re-rendering. */
  const moveRing = (event: PointerEvent<HTMLCanvasElement>) => {
    const element = ring.current;
    const canvas = event.currentTarget;
    if (!element) return;
    const box = canvas.getBoundingClientRect();
    const parent = canvas.parentElement?.getBoundingClientRect() ?? box;
    const diameter = ((size * 2) / canvas.width) * box.width;
    Object.assign(element.style, {
      display: "block",
      width: `${diameter}px`,
      height: `${diameter}px`,
      left: `${event.clientX - parent.left - diameter / 2}px`,
      top: `${event.clientY - parent.top - diameter / 2}px`,
    });
    handlers.onPointerMove(event);
  };

  const apply = () => {
    const warped = result();
    if (warped) onApply(warped);
    onOpenChange(false);
  };

  return (
    <Dialog open={source !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Liquify</DialogTitle>
          <DialogDescription>{HINTS[mode]}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <div className="bg-checkerboard relative flex min-h-64 items-center justify-center overflow-hidden rounded-lg border">
            <canvas
              ref={preview}
              width={source?.width}
              height={source?.height}
              aria-label="Liquify preview"
              className="max-h-[60vh] max-w-full cursor-none touch-none object-contain"
              onPointerDown={handlers.onPointerDown}
              onPointerMove={moveRing}
              onPointerUp={handlers.onPointerUp}
              onPointerCancel={handlers.onPointerUp}
              onPointerLeave={() =>
                ring.current?.style.setProperty("display", "none")
              }
            />
            <div
              ref={ring}
              aria-hidden
              className="pointer-events-none absolute hidden rounded-full border border-white shadow-[0_0_0_1px_black]"
            />
          </div>
          <div className="space-y-4">
            <OptionGroup
              label="Tool"
              choices={MODES}
              value={mode}
              onChange={setMode}
              columns={2}
            />
            <SliderRow
              label="Size"
              value={size}
              min={5}
              max={400}
              onChange={setSize}
            />
            <SliderRow
              label="Pressure"
              value={pressure}
              min={1}
              max={100}
              onChange={setPressure}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={reset}
              disabled={!changed}
            >
              Restore all
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!changed}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
