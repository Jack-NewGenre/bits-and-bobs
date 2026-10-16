"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TOKEN_GROUPS,
  type DesignToken,
  type DesignTokens,
  type TokenGroupKey,
} from "@/lib/text/design-md/types";

interface TokenEditorProps {
  tokens: DesignTokens;
  onChange: (tokens: DesignTokens) => void;
}

/** Every captured token as an editable name and value, grouped like the DESIGN.md. */
export function TokenEditor({ tokens, onChange }: TokenEditorProps) {
  const setGroup = (key: TokenGroupKey, list: DesignToken[]) =>
    onChange({ ...tokens, [key]: list });

  const editToken = (key: TokenGroupKey, index: number, patch: Partial<DesignToken>) =>
    setGroup(
      key,
      tokens[key].map((token, i) => (i === index ? { ...token, ...patch } : token))
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="design-name">Name</Label>
          <Input
            id="design-name"
            value={tokens.name}
            onChange={(event) => onChange({ ...tokens, name: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="design-source">Source</Label>
          <Input
            id="design-source"
            value={tokens.source}
            placeholder="https://"
            onChange={(event) => onChange({ ...tokens, source: event.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="design-overview">Overview</Label>
        <Input
          id="design-overview"
          value={tokens.overview}
          onChange={(event) => onChange({ ...tokens, overview: event.target.value })}
        />
      </div>
      {TOKEN_GROUPS.map(({ key, label, noun }) => (
        <fieldset key={key} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{label}</legend>
          {tokens[key].map((token, index) => (
            <div key={index} className="flex gap-2">
              <Input
                aria-label={`${noun} ${index + 1} name`}
                value={token.name}
                placeholder="name"
                onChange={(event) => editToken(key, index, { name: event.target.value })}
                className="w-40 shrink-0 font-mono text-xs"
              />
              <Input
                aria-label={`${noun} ${index + 1} value`}
                value={token.value}
                placeholder="value"
                onChange={(event) => editToken(key, index, { value: event.target.value })}
                className="font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${noun} ${index + 1}`}
                onClick={() => setGroup(key, tokens[key].filter((_, i) => i !== index))}
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGroup(key, [...tokens[key], { name: "", value: "" }])}
          >
            <Plus />
            Add {noun}
          </Button>
        </fieldset>
      ))}
    </div>
  );
}
