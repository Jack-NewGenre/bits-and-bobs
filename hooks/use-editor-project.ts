"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Canvas } from "fabric";
import { toast } from "sonner";

import { downloadBlob } from "@/lib/download";
import type { EditorDocument } from "@/lib/image/editor/document";
import {
  hasLayers,
  projectFilename,
  readProject,
  serialiseProject,
  type Project,
} from "@/lib/image/editor/project";
import {
  clearSession,
  loadSession,
  saveSession,
  sceneForEditing,
  sceneForFile,
} from "@/lib/image/editor/project-store";

/** Quiet time after the last change before autosaving. */
const AUTOSAVE_DELAY = 1500;

const PAUSED_TOAST = "autosave-paused";

/**
 * Keeps the work safe without an account: every change is autosaved in this
 * browser and offered back on the next visit, and a project can be saved as
 * a file (every layer still editable) and opened again later.
 */
export function useEditorProject(
  canvas: Canvas | null,
  doc: EditorDocument,
  name: string,
  version: number,
  open: (project: Project) => Promise<void>,
  holdAutosaveRef: RefObject<boolean>,
) {
  const [saved, setSaved] = useState<Project | null>(null);
  const latest = useRef({ doc, name, saved });
  // Nothing is autosaved until the stored session has been checked for.
  const checked = useRef(false);

  useEffect(() => {
    latest.current = { doc, name, saved };
  });

  const current = useCallback((): Project | null => {
    if (!canvas) return null;
    const { doc, name } = latest.current;
    return { doc, name, scene: canvas.toObject() };
  }, [canvas]);

  // Offer back the last session, once, when the editor first opens.
  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((project) => {
        if (!cancelled && project && hasLayers(project)) setSaved(project);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) checked.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const restoreSaved = useCallback(async () => {
    if (!saved) return;
    toast.dismiss(PAUSED_TOAST);
    setSaved(null);
    await open(saved);
  }, [saved, open]);

  /** Forgets the stored session, keeping whatever is on the canvas now in its place. */
  const discardSaved = useCallback(() => {
    toast.dismiss(PAUSED_TOAST);
    setSaved(null);
    const project = current();
    void (
      project && hasLayers(project) ? saveSession(project) : clearSession()
    ).catch(() => undefined);
  }, [current]);

  const offer = useRef({ restoreSaved, discardSaved });

  useEffect(() => {
    offer.current = { restoreSaved, discardSaved };
  });

  // Autosave after a pause, skipping the empty canvas the editor opens on.
  useEffect(() => {
    if (version === 0) return;
    // A partly loaded project must not overwrite the complete stored copy until a real edit.
    if (holdAutosaveRef.current) return void (holdAutosaveRef.current = false);
    const timer = window.setTimeout(() => {
      const project = current();
      if (!checked.current || !project || !hasLayers(project)) return;
      // There is only one stored session, so an unanswered offer of it pauses autosave.
      if (latest.current.saved) {
        toast("Autosave is paused so your last session is not overwritten.", {
          id: PAUSED_TOAST,
          duration: Infinity,
          action: {
            label: "Restore it",
            onClick: () => {
              if (window.confirm("Replace this canvas with your last session?"))
                void offer.current.restoreSaved();
            },
          },
          cancel: {
            label: "Discard it",
            onClick: () => offer.current.discardSaved(),
          },
        });
        return;
      }
      void saveSession(project).catch(() => undefined);
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [version, current, holdAutosaveRef]);

  const saveFile = useCallback(async () => {
    const project = current();
    if (!project) return;
    try {
      const text = serialiseProject({
        ...project,
        scene: await sceneForFile(project.scene),
      });
      downloadBlob(
        new Blob([text], { type: "application/json" }),
        projectFilename(project.name),
      );
    } catch {
      toast.error("The project could not be saved.");
    }
  }, [current]);

  const openProjectFile = useCallback(
    async (file: File) => {
      const project = readProject(await file.text());
      if (!project)
        return void toast.error("That file is not a Photo Studio project.");
      setSaved(null);
      await open({ ...project, scene: await sceneForEditing(project.scene) });
    },
    [open],
  );

  return { saved, restoreSaved, discardSaved, saveFile, openProjectFile };
}

export type EditorProject = ReturnType<typeof useEditorProject>;
