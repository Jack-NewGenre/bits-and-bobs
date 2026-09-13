import { createToolPage } from "@/components/organisms/tool-page";
import { PaletteExtractorTool } from "@/components/organisms/tools/palette-extractor/palette-extractor-tool";

const { metadata, Page } = createToolPage(
  "palette-extractor",
  <PaletteExtractorTool />,
);

export { metadata };
export default Page;
