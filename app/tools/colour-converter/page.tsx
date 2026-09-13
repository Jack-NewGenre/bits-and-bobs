import { createToolPage } from "@/components/organisms/tool-page";
import { ColourConverterTool } from "@/components/organisms/tools/colour-converter/colour-converter-tool";

const { metadata, Page } = createToolPage(
  "colour-converter",
  <ColourConverterTool />,
);

export { metadata };
export default Page;
