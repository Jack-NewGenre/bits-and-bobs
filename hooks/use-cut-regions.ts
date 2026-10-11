"use client";

import { useRef, useState } from "react";

import type { Rect } from "@/lib/image/cut-rect";
import type { Cut } from "@/lib/image/lasso";

export interface CutRegion extends Cut {
  id: number;
}

export interface CutRegions {
  regions: CutRegion[];
  selectedId: number | null;
  /** Add a cut and select it, as when one has just been drawn. */
  add: (cut: Cut) => void;
  update: (id: number, cut: Cut) => void;
  remove: (id: number) => void;
  /** Swap every box for a new set, as when pieces are detected. */
  replace: (rects: Rect[]) => void;
  select: (id: number | null) => void;
}

/** The pieces being cut out of an image, each with a stable id, and which one is selected. */
export function useCutRegions(): CutRegions {
  const [regions, setRegions] = useState<CutRegion[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const nextId = useRef(1);

  const withId = (cut: Cut): CutRegion => ({ ...cut, id: nextId.current++ });

  return {
    regions,
    selectedId,
    add: (cut) => {
      const region = withId(cut);
      setRegions((current) => [...current, region]);
      setSelectedId(region.id);
    },
    update: (id, cut) =>
      setRegions((current) =>
        current.map((region) => (region.id === id ? { ...cut, id } : region)),
      ),
    remove: (id) => {
      setRegions((current) => current.filter((region) => region.id !== id));
      setSelectedId((current) => (current === id ? null : current));
    },
    replace: (rects) => {
      setRegions(rects.map(withId));
      setSelectedId(null);
    },
    select: setSelectedId,
  };
}
