"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Catches anything a tool throws at runtime. These tools do heavy work in the
 * browser (WebAssembly, workers, canvas and downloaded AI models), so a
 * failure is a real possibility, and without this the user is left staring at
 * a blank page with no way back.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl">
        <TriangleAlert className="size-5" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        This tool hit a problem
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Something went wrong while the tool was running. Your files never left
        your device, so nothing has been shared. Trying again usually works.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => unstable_retry()}>
          <RotateCw />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">All tools</Link>
        </Button>
      </div>
    </div>
  );
}
