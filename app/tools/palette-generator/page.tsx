import { createToolPage } from "@/components/tool-page";
import { PaletteGeneratorTool } from "@/components/tools/palette-generator/palette-generator-tool";

const { metadata, Page } = createToolPage(
  "palette-generator",
  <PaletteGeneratorTool />,
);

export { metadata };
export default Page;
