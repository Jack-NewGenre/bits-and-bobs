import { createToolPage } from "@/components/tool-page";
import { ColourConverterTool } from "@/components/tools/colour-converter/colour-converter-tool";

const { metadata, Page } = createToolPage(
  "colour-converter",
  <ColourConverterTool />,
);

export { metadata };
export default Page;
