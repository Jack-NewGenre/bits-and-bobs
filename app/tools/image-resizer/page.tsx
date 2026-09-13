import { createToolPage } from "@/components/tool-page";
import { ImageResizerTool } from "@/components/tools/image-resizer/image-resizer-tool";

const { metadata, Page } = createToolPage(
  "image-resizer",
  <ImageResizerTool />,
);

export { metadata };
export default Page;
