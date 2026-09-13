/** Bundling a set of named blobs into a single archive the user can save. */

import { downloadBlob, uniqueNames } from "@/lib/download";

/**
 * Bundle named blobs into a zip. Kept apart from the download so it can be
 * tested against a real archive rather than a mock of the archiver.
 */
export async function buildZip(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  // client-zip streams the archive out as the entries are read, rather than
  // buffering every file twice the way a general-purpose zip library does.
  // The content field must be `input`: an entry with only a name is a valid
  // request for an empty *folder*, so getting this wrong yields an archive
  // full of directories rather than files, with no error anywhere.
  const { downloadZip: makeZip } = await import("client-zip");
  return makeZip(
    uniqueNames(entries).map(({ name, blob }) => ({ name, input: blob })),
  ).blob();
}

/** Bundle named blobs into a single zip and download it. */
export async function downloadZip(
  entries: { name: string; blob: Blob }[],
  zipName: string,
): Promise<void> {
  downloadBlob(await buildZip(entries), zipName);
}
