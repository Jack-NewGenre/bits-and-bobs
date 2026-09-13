"use client";

import { useMemo, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";

import { decodeJwt } from "@/lib/text/jwt";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/atoms/copy-button";
import {
  TextAreaField,
  TextPane,
  TwoPane,
} from "@/components/shared/text-tool-layout";

export function JwtDecoderTool() {
  const [token, setToken] = useState("");
  const result = useMemo(() => decodeJwt(token), [token]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3">
          <Label className="text-xs" htmlFor="jwt">
            Token
          </Label>
          <TextAreaField
            ariaLabel="Token"
            value={token}
            onChange={setToken}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
            className="min-h-28"
          />
          <p className="text-muted-foreground text-xs">
            A JWT is only encoded, not encrypted. Anyone holding it can read
            everything below. The signature is not checked here: that needs the
            issuer&apos;s key, which belongs on a server.
          </p>
        </CardContent>
      </Card>

      {result.error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-2">
            <TriangleAlert className="text-destructive size-4 shrink-0" />
            <p className="text-sm">{result.error}</p>
          </CardContent>
        </Card>
      )}

      {result.ok && (
        <>
          {result.unsigned && (
            <Card className="border-amber-500/40">
              <CardContent className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p className="text-sm">
                  This token says <code className="font-mono">alg: none</code>{" "}
                  , so it is not signed at all. A verifier that trusts the
                  header will accept anything, which is a well-known way in.
                </p>
              </CardContent>
            </Card>
          )}

          {result.expired !== undefined && (
            <Card
              className={cn(
                result.expired ? "border-destructive/40" : "border-emerald-500/40",
              )}
            >
              <CardContent className="flex items-center gap-2">
                {result.expired ? (
                  <TriangleAlert className="text-destructive size-4 shrink-0" />
                ) : (
                  <Check className="size-4 shrink-0 text-emerald-500" />
                )}
                <p className="text-sm">
                  {result.expired
                    ? "This token has expired."
                    : "This token has not expired."}
                </p>
              </CardContent>
            </Card>
          )}

          <TwoPane>
            <TextPane
              label="Header"
              aside={<CopyButton value={result.header ?? ""} size="xs" />}
            >
              <TextAreaField
                ariaLabel="Header"
                value={result.header ?? ""}
                readOnly
                className="min-h-40"
              />
            </TextPane>
            <TextPane
              label="Payload"
              aside={<CopyButton value={result.payload ?? ""} size="xs" />}
            >
              <TextAreaField
                ariaLabel="Payload"
                value={result.payload ?? ""}
                readOnly
                className="min-h-40"
              />
            </TextPane>
          </TwoPane>

          {result.claims && result.claims.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                <Label className="text-xs">Claims</Label>
                <ul className="divide-border divide-y">
                  {result.claims.map((claim) => (
                    <li
                      key={`${claim.name}-${claim.value}`}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2"
                    >
                      <code className="font-mono text-sm font-medium">
                        {claim.name}
                      </code>
                      <span className="min-w-0 flex-1 truncate font-mono text-sm">
                        {claim.readable ?? claim.value}
                      </span>
                      {claim.description && (
                        <span className="text-muted-foreground text-xs">
                          {claim.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
