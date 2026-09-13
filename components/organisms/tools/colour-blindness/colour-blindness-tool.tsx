"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  simulateImage,
  simulatedName,
  type SimulateResult,
} from "@/lib/colour/colour-blindness";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import {
  DEFAULT_VISION_SETTINGS,
  VisionResultPanel,
  type VisionSettings,
} from "@/components/organisms/tools/colour-blindness/vision-result-panel";

// Stable processor: the queue's first pass simulates the most common
// deficiency; the result panel re-renders live as the user switches type.
const simulateWithDefault = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) => {
  onProgress({ fraction: 0.2 });
  return simulateImage(file, DEFAULT_VISION_SETTINGS.vision, { signal });
};

export function ColourBlindnessTool() {
  const queue = useImageToolQueue<VisionSettings, SimulateResult>({
    processor: simulateWithDefault,
    defaultSettings: DEFAULT_VISION_SETTINGS,
    processingLabel: "Simulating…",
    downloadAll: {
      actionLabel: "Simulating",
      zipFilename: "colour-blindness.zip",
      buildEntry: async (item, currentSettings) => {
        const { blob } = await simulateImage(item.file, currentSettings.vision);
        return { name: simulatedName(item.name, currentSettings.vision), blob };
      },
    },
  });

  return (
    <ImageToolShell
      queue={queue}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · simulated on your device"
      emptyStateLabel="Simulating… results will appear here."
      resultPanel={
        queue.selectedItem && (
          <VisionResultPanel
            key={queue.selectedItem.id}
            item={queue.selectedItem}
            settings={queue.settings}
            onSettingsChange={queue.setSettings}
          />
        )
      }
    />
  );
}
