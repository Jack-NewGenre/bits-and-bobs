/**
 * A project keeps every layer editable: the document, its name and the whole
 * scene. It is saved as a file the user keeps, and autosaved in the browser.
 * Neither leaves the machine.
 */

import type { EditorDocument } from "@/lib/image/editor/document";

export type Scene = Record<string, unknown>;

export interface Project {
  name: string;
  doc: EditorDocument;
  scene: Scene;
}

const APP = "toolbox-image-editor";
const VERSION = 1;

export const PROJECT_EXTENSION = ".editor.json";
export const PROJECT_TYPES = [".json", "application/json"];

/** The keys on a serialised layer that point at pixels. */
const SOURCE_KEYS = ["src", "maskSrc"] as const;

/** True for a file that looks like a saved project rather than an image. */
export function isProjectFile(file: { name: string; type: string }): boolean {
  return (
    file.type === "application/json" ||
    file.name.toLowerCase().endsWith(".json")
  );
}

export function projectFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "image";
  return `${base}${PROJECT_EXTENSION}`;
}

export function serialiseProject(project: Project): string {
  return JSON.stringify({ app: APP, version: VERSION, ...project });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDocument(value: unknown): value is EditorDocument {
  return (
    isRecord(value) &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    (value.background === null || typeof value.background === "string")
  );
}

/** Keys Fabric loads an image from, at any depth (layers, masks, groups, patterns, filters). */
const IMAGE_KEYS = new Set<string>([...SOURCE_KEYS, "source"]);

/** Embedded pixels or a page-local blob URL: nothing that reaches the network. */
const isLocalUrl = (url: string) =>
  url.startsWith("data:") || url.startsWith("blob:");

/** False if any image anywhere in the value would be fetched from another server. */
function hasOnlyLocalSources(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(hasOnlyLocalSources);
  if (!isRecord(value)) return true;
  return Object.entries(value).every(([key, entry]) =>
    IMAGE_KEYS.has(key) ? isLocalSource(entry) : hasOnlyLocalSources(entry),
  );
}

/**
 * An image key holds a local URL, nothing, or a nested object to search. Any
 * other value (an array, say) is refused: assigning it to `img.src` turns it
 * into a string, so it could smuggle a remote URL past the check.
 */
function isLocalSource(entry: unknown): boolean {
  if (typeof entry === "string") return isLocalUrl(entry);
  if (entry === null || entry === undefined) return true;
  return isRecord(entry) && hasOnlyLocalSources(entry);
}

/** A project read back from a file or from storage, or `null` if it is not one. */
export function parseProject(value: unknown): Project | null {
  if (
    !isRecord(value) ||
    value.app !== APP ||
    typeof value.version !== "number"
  )
    return null;
  if (value.version > VERSION) return null;
  const { name, doc, scene } = value;
  if (typeof name !== "string" || !isDocument(doc) || !isRecord(scene))
    return null;
  if (!Array.isArray(scene.objects) || !hasOnlyLocalSources(scene)) return null;
  return { name, doc, scene };
}

export function readProject(text: string): Project | null {
  try {
    return parseProject(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * Rewrites every pixel source in a scene (each layer's image and mask),
 * leaving everything else as it was. Used to swap short-lived blob URLs for
 * data that outlasts the page, and back again.
 */
export async function mapSceneSources(
  scene: Scene,
  map: (value: unknown) => Promise<unknown>,
): Promise<Scene> {
  const objects = Array.isArray(scene.objects) ? scene.objects : [];
  const mapped = await Promise.all(
    objects.map(async (object: unknown) => {
      if (!isRecord(object)) return object;
      const entries = await Promise.all(
        SOURCE_KEYS.filter((key) => object[key] !== undefined).map(
          async (key) => [key, await map(object[key])] as const,
        ),
      );
      return { ...object, ...Object.fromEntries(entries) };
    }),
  );
  return { ...scene, objects: mapped };
}

/** True when a project is worth restoring: it has at least one layer. */
export function hasLayers(project: Project): boolean {
  return (
    Array.isArray(project.scene.objects) && project.scene.objects.length > 0
  );
}

/** Wraps a project for storage, marked so it can be recognised when read back. */
export function storedProject(project: Project): Record<string, unknown> {
  return { app: APP, version: VERSION, ...project };
}
