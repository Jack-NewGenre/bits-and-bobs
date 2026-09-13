import { createToolPage } from "@/components/organisms/tool-page";
import { ImageClipperTool } from "@/components/organisms/tools/image-clipper/image-clipper-tool";

const { metadata, Page } = createToolPage(
  "image-clipper",
  <ImageClipperTool />,
);

export { metadata };
export default Page;
