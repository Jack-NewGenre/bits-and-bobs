"use client";

import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";

import { ResultError } from "@/components/atoms/result-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPage } from "@/lib/text/design-md/fetch-page";

interface UrlFormProps {
  onPage: (html: string, url: string) => void;
}

/** A URL field that fetches the page and hands its HTML, styles inlined, to the tool. */
export function UrlForm({ onPage }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    try {
      onPage(await requestPage(url.trim()), url.trim());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The page could not be fetched.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          aria-label="Website URL"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          inputMode="url"
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !url.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Globe />}
          Fetch
        </Button>
      </div>
      {error && <ResultError message={error} />}
    </form>
  );
}
