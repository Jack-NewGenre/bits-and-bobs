import type { Adjustments } from "@/lib/image/editor/adjustments";
import type { SavedLayerStyles } from "@/lib/image/editor/layer-styles";
import type { LayerKind } from "@/lib/image/editor/layers";

// The layer metadata the editor keeps on each Fabric object, merged into
// Fabric's own interfaces so it is typed both live and once serialised.
declare module "fabric" {
  interface FabricObject {
    layerId?: string;
    layerName?: string;
    layerKind?: LayerKind;
    locked?: boolean;
    adjustments?: Adjustments;
    /** The layer mask: alpha in the layer's own pixel space, behind a URL. */
    maskSrc?: string;
    clipped?: boolean;
    layerStyles?: SavedLayerStyles;
  }

  interface SerializedObjectProps {
    layerId?: string;
    layerName?: string;
    layerKind?: LayerKind;
    locked?: boolean;
    adjustments?: Adjustments;
    /** The layer mask: alpha in the layer's own pixel space, behind a URL. */
    maskSrc?: string;
    clipped?: boolean;
    layerStyles?: SavedLayerStyles;
  }
}
