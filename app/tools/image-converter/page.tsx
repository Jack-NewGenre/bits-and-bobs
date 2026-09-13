import { createToolPage } from "@/components/organisms/tool-page";
import { ImageConverterTool } from "@/components/organisms/tools/image-converter/image-converter-tool";

const { metadata, Page } = createToolPage(
  "image-converter",
  <ImageConverterTool />,
);

export { metadata };
export default Page;
