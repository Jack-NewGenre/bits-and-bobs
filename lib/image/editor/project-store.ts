/**
 * Moving a project's pixels between the forms each place needs: blob URLs
 * while editing, data URLs in a saved file, and raw blobs in the browser's
 * own database for autosave (no base64 bloat, and nothing is uploaded).
 */

import {
  mapSceneSources,
  parseProject,
  storedProject,
  type Project,
  type Scene,
} from "@/lib/image/editor/project";

const DB_NAME = "toolbox";
const STORE = "image-editor";
const SESSION_KEY = "session";

async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  return response.blob();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const isUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  (value.startsWith("blob:") || value.startsWith("data:"));

/** Embeds every image in the scene, so a saved file stands on its own. */
export function sceneForFile(scene: Scene): Promise<Scene> {
  return mapSceneSources(scene, async (value) =>
    isUrl(value) && value.startsWith("blob:")
      ? blobToDataUrl(await urlToBlob(value))
      : value,
  );
}

/** Turns embedded or stored images back into blob URLs, so undo snapshots stay small. */
export function sceneForEditing(scene: Scene): Promise<Scene> {
  return mapSceneSources(scene, async (value) => {
    if (value instanceof Blob) return URL.createObjectURL(value);
    if (isUrl(value) && value.startsWith("data:"))
      return URL.createObjectURL(await urlToBlob(value));
    return value;
  });
}

function sceneForStorage(scene: Scene): Promise<Scene> {
  return mapSceneSources(scene, async (value) =>
    isUrl(value) ? urlToBlob(value) : value,
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveSession(project: Project): Promise<void> {
  const scene = await sceneForStorage(project.scene);
  await withStore("readwrite", (store) =>
    store.put(storedProject({ ...project, scene }), SESSION_KEY),
  );
}

export async function loadSession(): Promise<Project | null> {
  if (typeof indexedDB === "undefined") return null;
  const stored = parseProject(
    await withStore("readonly", (store) => store.get(SESSION_KEY)),
  );
  if (!stored) return null;
  return { ...stored, scene: await sceneForEditing(stored.scene) };
}

export async function clearSession(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await withStore("readwrite", (store) => store.delete(SESSION_KEY));
}
