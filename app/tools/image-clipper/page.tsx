import { createToolPage } from "@/components/tool-page";
import { ImageClipperTool } from "@/components/tools/image-clipper/image-clipper-tool";

const { metadata, Page } = createToolPage(
  "image-clipper",
  <ImageClipperTool />,
);

export { metadata };
export default Page;
