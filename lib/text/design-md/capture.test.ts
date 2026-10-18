import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildBookmarklet,
  buildCaptureScript,
} from "@/lib/text/design-md/bookmarklet";
import { captureDesign } from "@/lib/text/design-md/capture";

const PAGE = `
  <style>:root { --brand: #635bff; --gap: 8px; } .unrelated { --skip: 1px; }</style>
  <h1 style="font-size: 40px; color: #0a2540">Payments</h1>
  <p style="color: #425466">Hello <a href="#" style="color: #635bff">docs</a></p>
  <button style="background-color: #635bff; color: #ffffff; padding: 8px 16px; border-radius: 6px">Start</button>
  <button style="background-color: transparent">Later</button>
  <div style="display: none"><h2>Hidden</h2></div>
`;

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("captureDesign", () => {
  it("samples one of each component and skips hidden ones", () => {
    document.body.innerHTML = PAGE;
    const capture = captureDesign(document, window);

    expect(capture.kind).toBe("design-md-capture");
    expect(capture.components.h1?.["font-size"]).toBe("40px");
    expect(capture.components.button?.["border-radius"]).toBe("6px");
    expect(capture.components.button?.padding).toBe("8px 16px");
    expect(capture.components["button-secondary"]).toBeDefined();
    expect(capture.components.link).toBeDefined();
    expect(capture.components.h2).toBeUndefined();
  });

  it("prefers body text and links inside <main> over the header", () => {
    document.body.innerHTML = `
      <header><p style="color: #111111">Banner <a href="/" style="color: #222222">Home</a></p></header>
      <main><p style="color: #333333">Body <a href="/docs" style="color: #444444">docs</a></p></main>
    `;
    const { components } = captureDesign(document, window);

    expect(components.text?.color).toBe("rgb(51, 51, 51)");
    expect(components.link?.color).toBe("rgb(68, 68, 68)");
  });

  it("collects root variables but not ones scoped elsewhere", () => {
    document.body.innerHTML = PAGE;
    const { variables } = captureDesign(document, window);

    expect(Object.keys(variables)).toEqual(
      expect.arrayContaining(["brand", "gap"]),
    );
    expect(variables).not.toHaveProperty("skip");
  });

  it("counts radii and spacing from what is on the page", () => {
    document.body.innerHTML = PAGE;
    const { counts } = captureDesign(document, window);

    expect(counts.radii["6px"]).toBe(1);
    expect(counts.spacing["16px"]).toBeGreaterThan(0);
  });
});

describe("bookmarklet", () => {
  it("is a javascript: link carrying the whole script", () => {
    const link = buildBookmarklet();
    expect(link.startsWith("javascript:")).toBe(true);
    expect(decodeURIComponent(link.slice("javascript:".length))).toBe(
      buildCaptureScript(),
    );
  });

  it("runs on its own and copies the capture to the clipboard", async () => {
    document.body.innerHTML = PAGE;
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    new Function(buildCaptureScript())();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());

    const copied = JSON.parse(writeText.mock.calls[0][0]);
    expect(copied.kind).toBe("design-md-capture");
    expect(copied.components.button).toBeDefined();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Design captured"),
    );
  });
});
