import { createToolPage } from "@/components/tool-page";
import { ImageEnhancerTool } from "@/components/tools/image-enhancer/image-enhancer-tool";

const { metadata, Page } = createToolPage(
  "image-enhancer",
  <ImageEnhancerTool />,
);

export { metadata };
export default Page;
