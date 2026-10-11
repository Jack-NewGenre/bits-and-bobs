import { createToolPage } from "@/components/organisms/tool-page";
import { ClipArtCutterTool } from "@/components/organisms/tools/clip-art-cutter/clip-art-cutter-tool";

const { metadata, Page } = createToolPage(
  "clip-art-cutter",
  <ClipArtCutterTool />,
);

export { metadata };
export default Page;
