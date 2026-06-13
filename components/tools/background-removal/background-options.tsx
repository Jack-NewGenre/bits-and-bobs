"use client";

import { useRef } from "react";
import { ImagePlus, Palette, Square } from "lucide-react";

import type { BackgroundSettings } from "@/hooks/use-composited-result";
import type { BackgroundMode } from "@/lib/composite";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const PRESET_COLORS = [
  "#ffffff",
  "#000000",
  "#f43f5e",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
];

const MODES: { value: BackgroundMode; label: string; icon: typeof Square }[] = [
  { value: "transparent", label: "Transparent", icon: Square },
  { value: "color", label: "Solid colour", icon: Palette },
  { value: "image", label: "Image", icon: ImagePlus },
];

interface BackgroundOptionsProps {
  settings: BackgroundSettings;
  onChange: (settings: BackgroundSettings) => void;
}

export function BackgroundOptions({
  settings,
  onChange,
}: BackgroundOptionsProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const setMode = (mode: BackgroundMode) => onChange({ ...settings, mode });
  const setColor = (color: string) =>
    onChange({ ...settings, mode: "color", color });

  const setImage = (file: File | undefined) => {
    if (!file) return;
    // The previous URL (and unmount cleanup) is revoked by the owner of
    // `settings` via an effect keyed on `settings.imageUrl`.
    onChange({
      ...settings,
      mode: "image",
      imageUrl: URL.createObjectURL(file),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Background">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={settings.mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
              settings.mode === value
                ? "border-primary bg-accent"
                : "hover:bg-accent/50",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {settings.mode === "color" && (
        <div className="space-y-2">
          <Label className="text-xs">Colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                onClick={() => setColor(color)}
                style={{ backgroundColor: color }}
                className={cn(
                  "size-7 rounded-full border transition-transform hover:scale-110",
                  settings.color === color && "ring-ring ring-2 ring-offset-2",
                )}
              />
            ))}
            <input
              type="color"
              aria-label="Custom colour"
              value={settings.color}
              onChange={(event) => setColor(event.target.value)}
              className="size-7 cursor-pointer rounded-full border bg-transparent p-0"
            />
          </div>
        </div>
      )}

      {settings.mode === "image" && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            {settings.imageUrl ? "Change image" : "Choose image"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              setImage(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
