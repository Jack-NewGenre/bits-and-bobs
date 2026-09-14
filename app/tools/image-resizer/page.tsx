import { createToolPage } from "@/components/organisms/tool-page";
import { ImageResizerTool } from "@/components/organisms/tools/image-resizer/image-resizer-tool";

const { metadata, Page } = createToolPage(
  "image-resizer",
  <ImageResizerTool />,
);

export { metadata };
export default Page;
