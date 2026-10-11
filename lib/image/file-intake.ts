/**
 * What counts as an acceptable dropped file, and how a batch is split into
 * the files a tool can work on and the ones it has to turn away.
 */

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** For tools that also trace or rasterise vector artwork. */
export const IMAGE_AND_SVG_TYPES = [...ACCEPTED_TYPES, "image/svg+xml"];
export const PDF_TYPES = ["application/pdf"];
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
/**
 * PDFs are routinely far larger than images (a scanned document runs to tens
 * of megabytes) and nothing is uploaded, so the only real limit is the
 * browser's own memory.
 */
export const MAX_PDF_BYTES = 200 * 1024 * 1024; // 200MB

export interface RejectedFile {
  name: string;
  reason: string;
}

/** One line explaining what was turned away, for a toast. */
export function rejectionMessage(rejected: RejectedFile[]): string {
  return rejected.length === 1
    ? `${rejected[0].name}: ${rejected[0].reason}`
    : `${rejected.length} files skipped (unsupported type or too large)`;
}

export interface PartitionedFiles {
  accepted: File[];
  rejected: RejectedFile[];
}

/**
 * Pull image files out of a clipboard payload. Screenshots arrive as an
 * unnamed `image.png`, so each one is given a distinct, sortable name.
 */
export function filesFromClipboard(
  items: DataTransferItemList | undefined,
  now: number = Date.now(),
): File[] {
  if (!items) return [];

  return Array.from(items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
    .map((file, index) => {
      const extension = file.type.split("/")[1] ?? "png";
      const suffix = index === 0 ? "" : `-${index + 1}`;
      return new File([file], `pasted-${now}${suffix}.${extension}`, {
        type: file.type,
      });
    });
}

function describeLimit(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

export function partitionFiles(
  files: File[],
  types: string[] = ACCEPTED_TYPES,
  maxBytes: number = MAX_FILE_BYTES,
): PartitionedFiles {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of files) {
    if (!types.includes(file.type)) {
      rejected.push({ name: file.name, reason: "Unsupported file type" });
    } else if (file.size > maxBytes) {
      rejected.push({
        name: file.name,
        reason: `File is larger than ${describeLimit(maxBytes)}`,
      });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}
