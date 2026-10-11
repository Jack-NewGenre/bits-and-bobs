import { describe, expect, it } from "vitest";

import {
  hasLayers,
  mapSceneSources,
  parseProject,
  projectFilename,
  readProject,
  serialiseProject,
} from "@/lib/image/editor/project";

const PROJECT = {
  name: "Holiday",
  doc: { width: 100, height: 50, background: null },
  scene: {
    version: "7",
    objects: [
      { type: "Image", src: "blob:a", maskSrc: "blob:m" },
      { type: "Rect" },
    ],
  },
};

describe("image editor projects", () => {
  it("round-trips through a file", () => {
    expect(readProject(serialiseProject(PROJECT))).toEqual(PROJECT);
  });

  it("rejects anything that is not a project", () => {
    expect(readProject("not json")).toBeNull();
    expect(parseProject({ ...PROJECT })).toBeNull();
    expect(
      readProject(
        JSON.stringify({ app: "toolbox-image-editor", version: 1, name: "x" }),
      ),
    ).toBeNull();
    expect(
      readProject(
        serialiseProject(PROJECT).replace('"version":1', '"version":99'),
      ),
    ).toBeNull();
  });

  it("rejects a project that would fetch an image from another server", () => {
    const withObjects = (objects: unknown[]) =>
      serialiseProject({ ...PROJECT, scene: { ...PROJECT.scene, objects } });
    const remote = "https://example.com/pixel.png";
    expect(
      readProject(withObjects([{ type: "Image", src: remote }])),
    ).toBeNull();
    expect(
      readProject(
        withObjects([{ type: "Image", src: "data:x", maskSrc: remote }]),
      ),
    ).toBeNull();
    expect(
      readProject(
        withObjects([
          { type: "Group", objects: [{ type: "Image", src: remote }] },
        ]),
      ),
    ).toBeNull();
    expect(
      readProject(withObjects([{ type: "Rect", fill: { source: remote } }])),
    ).toBeNull();
    expect(
      readProject(withObjects([{ type: "Image", src: [remote] }])),
    ).toBeNull();
    expect(
      readProject(
        withObjects([{ type: "Image", src: "data:x", maskSrc: [remote] }]),
      ),
    ).toBeNull();
    expect(
      readProject(
        withObjects([{ type: "Image", src: "data:image/png;base64,AA" }]),
      ),
    ).not.toBeNull();
  });

  it("names the file after the document", () => {
    expect(projectFilename("photo.png")).toBe("photo.editor.json");
    expect(projectFilename("  ")).toBe("image.editor.json");
  });

  it("rewrites image and mask sources and nothing else", async () => {
    const scene = await mapSceneSources(
      PROJECT.scene,
      async (value) => `data:${String(value)}`,
    );
    expect(scene.objects).toEqual([
      { type: "Image", src: "data:blob:a", maskSrc: "data:blob:m" },
      { type: "Rect" },
    ]);
    expect(scene.version).toBe("7");
  });

  it("only restores a project with layers", () => {
    expect(hasLayers(PROJECT)).toBe(true);
    expect(hasLayers({ ...PROJECT, scene: { objects: [] } })).toBe(false);
  });
});
