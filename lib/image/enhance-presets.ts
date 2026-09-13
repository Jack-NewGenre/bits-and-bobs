/**
 * Named starting points for the enhancer.
 *
 * Kept apart from the pipeline so the tuning values can be read and adjusted
 * without wading through the pixel maths that consumes them.
 */

import type { EnhanceSettings } from "@/lib/image/enhance";

export interface EnhancePreset {
  id: string;
  label: string;
  settings: EnhanceSettings;
}

export const ENHANCE_PRESETS: EnhancePreset[] = [
  {
    id: "auto",
    label: "Auto",
    settings: {
      engine: "fast",
      format: "source",
      quality: 92,
      scale: 2,
      sharpen: 35,
      denoise: 18,
      brightness: 2,
      contrast: 8,
      saturation: 6,
    },
  },
  {
    id: "sharpen",
    label: "Sharpen",
    settings: {
      engine: "fast",
      format: "source",
      quality: 92,
      scale: 2,
      sharpen: 65,
      denoise: 0,
      brightness: 0,
      contrast: 6,
      saturation: 0,
    },
  },
  {
    id: "denoise",
    label: "Denoise",
    settings: {
      engine: "fast",
      format: "source",
      quality: 92,
      scale: 2,
      sharpen: 18,
      denoise: 55,
      brightness: 0,
      contrast: 4,
      saturation: 0,
    },
  },
  {
    id: "vivid",
    label: "Vivid",
    settings: {
      engine: "fast",
      format: "source",
      quality: 92,
      scale: 2,
      sharpen: 28,
      denoise: 10,
      brightness: 4,
      contrast: 14,
      saturation: 28,
    },
  },
];

export const DEFAULT_ENHANCE_SETTINGS: EnhanceSettings = ENHANCE_PRESETS[0]
  .settings;
