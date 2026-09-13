"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  transformImage,
  type TransformResult,
  type TransformSettings,
} from "@/lib/image/transform";
import { transformInWorker } from "@/lib/workers/image-worker-client";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import {
  TransformResultPanel,
  transformedName,
} from "@/components/organisms/transform-result-panel";
import type { ImageQueueItem } from "@/hooks/use-image-queue";

interface TransformToolProps {
  /** Starting settings; also what the queue's first pass runs with. */
  defaultSettings: TransformSettings;
  /** Verb shown in the queue and toasts, e.g. "Compressing". */
  verb: string;
  /** Suffix added to downloaded filenames, e.g. "-compressed". */
  suffix: string;
  zipFilename: string;
  dropzoneHint: string;
  showSaving?: boolean;
  /** The tool's own controls, given the live settings. */
  renderOptions: (
    settings: TransformSettings,
    onChange: (settings: TransformSettings) => void,
    item: ImageQueueItem<TransformResult>,
  ) => React.ReactNode;
}

/**
 * The convert / compress / resize trio, which share one pipeline and differ
 * only in which controls they expose and what they emphasise.
 */
export function TransformTool({
  defaultSettings,
  verb,
  suffix,
  zipFilename,
  dropzoneHint,
  showSaving,
  renderOptions,
}: TransformToolProps) {
  // Stable processor: the queue's first pass uses the tool's defaults; the
  // result panel re-runs live as the user changes them.
  const processor = (
    file: File,
    onProgress: (progress: { fraction: number }) => void,
    signal: AbortSignal,
  ) => transformInWorker(file, defaultSettings, { onProgress, signal });

  const {
    items,
    addFiles,
    removeItem,
    retryItem,
    clear,
    setPinnedId,
    settings,
    setSettings,
    statusLabel,
    doneItems,
    selectedItem,
    handleReject,
    handleDownloadAll,
  } = useImageToolQueue<TransformSettings, TransformResult>({
    processor,
    defaultSettings,
    processingLabel: `${verb}…`,
    downloadAll: {
      actionLabel: verb,
      zipFilename,
      buildEntry: async (item, current) => {
        const { blob } = await transformImage(item.file, current);
        return { name: transformedName(item.name, blob, suffix), blob };
      },
    },
  });

  return (
    <ImageToolShell
      items={items}
      statusLabel={statusLabel}
      selectedId={selectedItem?.id}
      onSelect={setPinnedId}
      onRemove={removeItem}
      onRetry={retryItem}
      onFiles={addFiles}
      onReject={handleReject}
      onClear={clear}
      dropzoneHint={dropzoneHint}
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel={`${verb}… results will appear here.`}
      transparentThumbnails
      resultPanel={
        selectedItem && (
          <TransformResultPanel
            key={selectedItem.id}
            item={selectedItem}
            settings={settings}
            defaultSettings={defaultSettings}
            suffix={suffix}
            showSaving={showSaving}
            onSettingsChange={setSettings}
          >
            {renderOptions(settings, setSettings, selectedItem)}
          </TransformResultPanel>
        )
      }
    />
  );
}
