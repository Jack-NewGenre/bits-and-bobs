import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the worker's build step. Next's bundler copies a worker entry through
 * verbatim instead of compiling it, which shipped unparsed TypeScript to the
 * browser. The worker then died on load and every job silently fell back to
 * the main thread. These checks fail loudly if that ever regresses.
 */
const BUNDLE_PATH = resolve(process.cwd(), "public/image-worker.js");

describe("built image worker", () => {
  const source = readFileSync(BUNDLE_PATH, "utf8");

  it("is bundled, not raw source with unresolved project imports", () => {
    expect(source).not.toMatch(/from\s+["']@\//);
    expect(source).not.toMatch(/from\s+["']imagetracerjs["']/);
  });

  it("is syntactically valid JavaScript", () => {
    expect(() => new Function(source)).not.toThrow();
  });

  it("bundles both pipelines and the readiness handshake", () => {
    expect(source).toContain("ready");
    expect(source).toContain("enhance");
    // Minification renames our own symbols, so assert on strings that survive:
    // the tracer's own API and the offscreen capability probe.
    expect(source).toContain("imagedataToSVG");
    expect(source).toContain("OffscreenCanvas");
  });
});
