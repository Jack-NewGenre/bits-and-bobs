"use client";

import { MousePointerClick } from "lucide-react";
import { useMemo } from "react";

import { CopyButton } from "@/components/atoms/copy-button";
import { TextAreaField } from "@/components/atoms/text-area-field";
import { TextPane } from "@/components/molecules/text-pane";
import { buildBookmarklet, buildCaptureScript } from "@/lib/text/design-md/bookmarklet";
import type { DesignInput } from "@/lib/text/design-md/parse-input";

interface CapturePanelProps {
  value: string;
  onChange: (value: string) => void;
  input: DesignInput;
}

const KIND_LABELS: Record<DesignInput["kind"], string> = {
  empty: "",
  capture: "Bookmarklet capture",
  html: "HTML",
  css: "CSS",
};

/** The fallback for sites a URL fetch cannot read: a bookmarklet capture or a paste. */
export function CapturePanel({ value, onChange, input }: CapturePanelProps) {
  const bookmarklet = useMemo(() => buildBookmarklet(), []);

  return (
    <details className="group space-y-4">
      <summary className="text-muted-foreground cursor-pointer text-sm">
        Or paste a capture, CSS or HTML (for sites styled by JavaScript or behind a login)
      </summary>
      <ol className="text-muted-foreground mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Drag{" "}
          <a
            // React blocks javascript: URLs in props, so the link is set on the node directly.
            ref={(node) => node?.setAttribute("href", bookmarklet)}
            onClick={(event) => event.preventDefault()}
            className="bg-primary text-primary-foreground inline-flex cursor-grab items-center gap-1 rounded-md px-2 py-0.5 font-medium"
          >
            <MousePointerClick className="size-3.5" />
            Capture design
          </a>{" "}
          to your bookmarks bar, or{" "}
          <CopyButton
            value={buildCaptureScript}
            label="copy the script"
            variant="ghost"
            size="xs"
            className="inline-flex"
          />{" "}
          to run in the devtools console.
        </li>
        <li>Open the site you want and click the bookmark. The capture goes to your clipboard.</li>
        <li>Paste it below. You can paste a site&apos;s CSS or saved HTML instead.</li>
      </ol>
      <TextPane label="Capture" aside={KIND_LABELS[input.kind]}>
        <TextAreaField
          ariaLabel="Capture, CSS or HTML"
          value={value}
          onChange={onChange}
          placeholder="Paste the capture, some CSS or an HTML page"
          className="min-h-40"
        />
      </TextPane>
    </details>
  );
}
