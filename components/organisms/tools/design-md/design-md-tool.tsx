"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { CopyButton } from "@/components/atoms/copy-button";
import { DownloadButton } from "@/components/atoms/download-button";
import { TextAreaField } from "@/components/atoms/text-area-field";
import { TwoPane } from "@/components/atoms/two-pane";
import { TextPane } from "@/components/molecules/text-pane";
import { Card, CardContent } from "@/components/ui/card";
import { CapturePanel } from "@/components/organisms/tools/design-md/capture-panel";
import { UrlForm } from "@/components/organisms/tools/design-md/url-form";
import { TokenEditor } from "@/components/organisms/tools/design-md/token-editor";
import { useDebounced } from "@/hooks/use-debounced";
import { downloadBlob } from "@/lib/download";
import { STARTER_TOKENS, toDesignTokens } from "@/lib/text/design-md/normalise";
import { readDesignInput } from "@/lib/text/design-md/parse-input";
import { renderDesignMd } from "@/lib/text/design-md/render";
import type { DesignTokens } from "@/lib/text/design-md/types";

export function DesignMdTool() {
  const [source, setSource] = useState("");
  const [tokens, setTokens] = useState<DesignTokens>(STARTER_TOKENS);
  const input = useMemo(() => readDesignInput(source), [source]);
  const markdown = renderDesignMd(useDebounced(tokens));

  // A new paste replaces the tokens; editing them afterwards is the point of the editor.
  const handleSource = (value: string) => {
    setSource(value);
    const next = readDesignInput(value);
    if (next.kind !== "empty") setTokens(toDesignTokens(next.capture));
  };

  const handlePage = (html: string, url: string) => {
    setSource(html);
    setTokens(toDesignTokens({ ...readDesignInput(html).capture, url }));
  };

  const download = () =>
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "DESIGN.md");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <UrlForm onPage={handlePage} />
          {input.linkedStylesheets > 0 && (
            <p className="flex items-start gap-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              This page links {input.linkedStylesheets} stylesheet
              {input.linkedStylesheets === 1 ? "" : "s"} that could not be read. Use the
              bookmarklet for the full picture.
            </p>
          )}
          <CapturePanel value={source} onChange={handleSource} input={input} />
        </CardContent>
      </Card>
      <TwoPane>
        <TextPane label="Tokens">
          <Card>
            <CardContent>
              <TokenEditor tokens={tokens} onChange={setTokens} />
            </CardContent>
          </Card>
        </TextPane>
        <TextPane
          label="DESIGN.md"
          aside={
            <div className="flex gap-2">
              <CopyButton value={markdown} size="sm" variant="outline" />
              <DownloadButton onClick={download} label="DESIGN.md" variant="outline" />
            </div>
          }
        >
          <TextAreaField
            ariaLabel="DESIGN.md output"
            value={markdown}
            readOnly
            className="min-h-[40rem] font-mono text-xs"
          />
        </TextPane>
      </TwoPane>
    </div>
  );
}
