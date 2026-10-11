/**
 * Carries files from the home page search into the tool the user picks.
 * Files cannot travel in a URL and nothing is uploaded, so they wait in memory
 * across the client-side navigation and the tool takes them once, on mount.
 */

let pending: File[] = [];

export function handOffFiles(files: File[]): void {
  pending = [...files];
}

/** Forgets any waiting files, as when the user clears them. */
export function clearHandedOffFiles(): void {
  pending = [];
}

/**
 * Whether a click on a link navigates this tab. A modified or middle click
 * opens a new tab, which has its own memory and so never gets the files.
 */
export function navigatesInPlace(click: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  const { button, metaKey, ctrlKey, shiftKey, altKey } = click;
  return button === 0 && !metaKey && !ctrlKey && !shiftKey && !altKey;
}

/** Returns the waiting files and forgets them, so a remount gets nothing. */
export function takeHandedOffFiles(): File[] {
  const files = pending;
  pending = [];
  return files;
}
