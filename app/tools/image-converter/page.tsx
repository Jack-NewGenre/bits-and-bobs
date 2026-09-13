import { createToolPage } from "@/components/tool-page";
import { ImageConverterTool } from "@/components/tools/image-converter/image-converter-tool";

const { metadata, Page } = createToolPage(
  "image-converter",
  <ImageConverterTool />,
);

export { metadata };
export default Page;
