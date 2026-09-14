import { createToolPage } from "@/components/organisms/tool-page";
import { PaletteGeneratorTool } from "@/components/organisms/tools/palette-generator/palette-generator-tool";

const { metadata, Page } = createToolPage(
  "palette-generator",
  <PaletteGeneratorTool />,
);

export { metadata };
export default Page;
