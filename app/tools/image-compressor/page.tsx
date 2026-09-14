import { createToolPage } from "@/components/organisms/tool-page";
import { ImageCompressorTool } from "@/components/organisms/tools/image-compressor/image-compressor-tool";

const { metadata, Page } = createToolPage(
  "image-compressor",
  <ImageCompressorTool />,
);

export { metadata };
export default Page;
