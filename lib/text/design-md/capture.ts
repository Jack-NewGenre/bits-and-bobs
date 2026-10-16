import type { DesignCapture } from "@/lib/text/design-md/types";

/**
 * Reads the design of the page it runs on: custom properties, how often each
 * colour, font, size, radius and shadow is used, and the styles of one sample
 * of each common component.
 *
 * It runs inside someone else's page as a bookmarklet, built from this
 * function's source text. So it must stay self-contained: no imports, no
 * helpers or constants from outside its body, only its arguments and
 * standard browser globals. The role and property lists repeat the ones in
 * `types.ts` for that reason.
 */
export function captureDesign(doc: Document, win: Window): DesignCapture {
  const MAX_ELEMENTS = 3000;
  const MAX_VARIABLES = 400;
  const PROPERTIES = [
    "background-color",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-transform",
    "padding",
    "border",
    "border-radius",
    "box-shadow",
  ];

  const counts: DesignCapture["counts"] = {
    colours: {},
    backgrounds: {},
    fontFamilies: {},
    fontSizes: {},
    radii: {},
    shadows: {},
    spacing: {},
  };
  const bump = (bucket: Record<string, number>, value: string) => {
    if (value) bucket[value] = (bucket[value] || 0) + 1;
  };
  const isClear = (colour: string) =>
    !colour || colour === "transparent" || /^rgba\(.*,\s*0\)$/.test(colour);
  const sides = (style: CSSStyleDeclaration, prefix: string, suffix: string) =>
    ["top", "right", "bottom", "left"].map((side) =>
      style.getPropertyValue(prefix + side + suffix)
    );
  const readProperty = (style: CSSStyleDeclaration, property: string) => {
    if (property === "padding") {
      const [top, right, bottom, left] = sides(style, "padding-", "");
      if (top === bottom && right === left) {
        return top === right ? top : top + " " + right;
      }
      return [top, right, bottom, left].join(" ");
    }
    if (property === "border") {
      const width = style.getPropertyValue("border-top-width");
      const kind = style.getPropertyValue("border-top-style");
      if (!kind || kind === "none" || width === "0px") return "none";
      return [width, kind, style.getPropertyValue("border-top-color")].join(" ");
    }
    if (property === "border-radius") {
      const radius =
        style.getPropertyValue("border-radius") ||
        style.getPropertyValue("border-top-left-radius");
      const first = radius.split(" ")[0];
      return first === "0" ? "0px" : first;
    }
    return style.getPropertyValue(property);
  };
  const isVisible = (el: Element) => {
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    }
    if (win.getComputedStyle(el).visibility === "hidden") return false;
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (win.getComputedStyle(node).display === "none") return false;
    }
    return true;
  };
  const hasOwnText = (el: Element) =>
    Array.from(el.childNodes).some(
      (node) => node.nodeType === 3 && (node.textContent || "").trim() !== ""
    );

  const elements = Array.from(doc.body.querySelectorAll("*")).slice(0, MAX_ELEMENTS);
  for (const el of elements) {
    if (!isVisible(el)) continue;
    const style = win.getComputedStyle(el);
    const background = style.getPropertyValue("background-color");
    if (!isClear(background)) bump(counts.backgrounds, background);
    if (hasOwnText(el)) {
      bump(counts.colours, style.getPropertyValue("color"));
      bump(counts.fontFamilies, style.getPropertyValue("font-family"));
      bump(counts.fontSizes, style.getPropertyValue("font-size"));
    }
    const border = readProperty(style, "border");
    if (border !== "none") {
      const borderColour = style.getPropertyValue("border-top-color");
      if (!isClear(borderColour)) bump(counts.colours, borderColour);
    }
    const radius = readProperty(style, "border-radius");
    if (radius && radius !== "0px") bump(counts.radii, radius);
    const shadow = style.getPropertyValue("box-shadow");
    if (shadow && shadow !== "none") bump(counts.shadows, shadow);
    for (const value of sides(style, "padding-", "").concat(
      style.getPropertyValue("row-gap"),
      style.getPropertyValue("column-gap")
    )) {
      if (/^[1-9][\d.]*px$/.test(value)) bump(counts.spacing, value);
    }
  }

  const describe = (el: Element) => {
    const style = win.getComputedStyle(el);
    const styles: Record<string, string> = {};
    for (const property of PROPERTIES) {
      const value = readProperty(style, property);
      if (value) styles[property] = value;
    }
    return styles;
  };
  const find = (selector: string, accept?: (el: Element) => boolean) =>
    Array.from(doc.querySelectorAll(selector)).find(
      (el) => isVisible(el) && (!accept || accept(el))
    );
  const backgroundOf = (el: Element) =>
    win.getComputedStyle(el).getPropertyValue("background-color");
  const pageBackground = backgroundOf(doc.body);
  const buttons = 'button, [role="button"], input[type="submit"], a[class*="btn"], a[class*="button"]';
  const samples: Record<string, Element | undefined> = {
    body: doc.body,
    h1: find("h1"),
    h2: find("h2"),
    h3: find("h3"),
    text: find("main p, article p, p"),
    link: find("main p a[href], p a[href], main a[href], a[href]"),
    button: find(buttons, (el) => !isClear(backgroundOf(el))),
    "button-secondary": find(buttons, (el) => isClear(backgroundOf(el))),
    input: find(
      'input[type="text"], input[type="email"], input[type="search"], input:not([type]), textarea, select'
    ),
    card: find('article, [class*="card"], [class*="Card"], li, section > div', (el) => {
      const style = win.getComputedStyle(el);
      const background = backgroundOf(el);
      const lifted =
        style.getPropertyValue("box-shadow") !== "none" ||
        readProperty(style, "border") !== "none" ||
        (!isClear(background) && background !== pageBackground);
      return lifted && readProperty(style, "border-radius") !== "0px";
    }),
    badge: find('[class*="badge"], [class*="Badge"], [class*="chip"], [class*="tag"], [class*="pill"]'),
    nav: find("header, nav"),
    code: find("pre, code"),
  };
  const components: DesignCapture["components"] = {};
  for (const role of Object.keys(samples)) {
    const el = samples[role];
    if (el) components[role as keyof DesignCapture["components"]] = describe(el);
  }

  const root = doc.documentElement;
  const rootStyle = win.getComputedStyle(root);
  const names: Record<string, true> = {};
  const collect = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ("selectorText" in rule && "style" in rule) {
        const styleRule = rule as CSSStyleRule;
        if (/(^|,|\s):root|(^|,\s*)html\b/.test(styleRule.selectorText)) {
          for (const name of Array.from(styleRule.style)) {
            if (name.startsWith("--")) names[name] = true;
          }
        }
      }
      if ("cssRules" in rule) collect((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      collect(sheet.cssRules);
    } catch {
      // A stylesheet from another origin cannot be read. Its variables still
      // show up in the root's computed style below, where the browser offers them.
    }
  }
  for (const name of Array.from(rootStyle)) {
    if (name.startsWith("--")) names[name] = true;
  }
  const variables: Record<string, string> = {};
  for (const name of Object.keys(names).slice(0, MAX_VARIABLES)) {
    const value = rootStyle.getPropertyValue(name).trim();
    if (value) variables[name.slice(2)] = value;
  }

  return {
    kind: "design-md-capture",
    version: 1,
    title: doc.title,
    url: win.location.href,
    variables,
    counts,
    components,
  };
}
