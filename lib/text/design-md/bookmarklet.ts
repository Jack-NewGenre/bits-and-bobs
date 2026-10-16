import { captureDesign } from "@/lib/text/design-md/capture";

const TOAST_STYLE = [
  "position:fixed",
  "z-index:2147483647",
  "top:16px",
  "right:16px",
  "max-width:320px",
  "padding:10px 14px",
  "background:#111",
  "color:#fff",
  "font:14px/1.4 system-ui,sans-serif",
  "border-radius:8px",
  "box-shadow:0 4px 16px rgba(0,0,0,.3)",
].join(";");

/**
 * The script that runs on the page being captured: read the design, copy it
 * to the clipboard and say so. If the page refuses the clipboard, the capture
 * is logged to the console instead, so it can still be copied by hand.
 *
 * Nothing is sent anywhere. The only way out of the page is the clipboard.
 */
export function buildCaptureScript(): string {
  return `(function () {
  var data = JSON.stringify((${captureDesign.toString()})(document, window));
  var toast = function (message) {
    var note = document.createElement("div");
    note.textContent = message;
    note.style.cssText = ${JSON.stringify(TOAST_STYLE)};
    document.body.appendChild(note);
    setTimeout(function () { note.remove(); }, 4000);
  };
  var fallback = function () {
    var field = document.createElement("textarea");
    field.value = data;
    document.body.appendChild(field);
    field.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (error) {}
    field.remove();
    if (copied) {
      toast("Design captured. Paste it into the Bits & Bobs DESIGN.md tool.");
    } else {
      console.log(data);
      toast("Could not reach the clipboard. The capture is in the console: copy it from there.");
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(data).then(function () {
      toast("Design captured. Paste it into the Bits & Bobs DESIGN.md tool.");
    }, fallback);
  } else {
    fallback();
  }
})();`;
}

/** The same script as a link to drag to the bookmarks bar. */
export function buildBookmarklet(): string {
  return `javascript:${encodeURIComponent(buildCaptureScript())}`;
}
