import { createToolPage } from "@/components/organisms/tool-page";
import { ImageEnhancerTool } from "@/components/organisms/tools/image-enhancer/image-enhancer-tool";

const { metadata, Page } = createToolPage(
  "image-enhancer",
  <ImageEnhancerTool />,
);

export { metadata };
export default Page;
