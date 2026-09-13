import { createToolPage } from "@/components/organisms/tool-page";
import { ColourBlindnessTool } from "@/components/organisms/tools/colour-blindness/colour-blindness-tool";

const { metadata, Page } = createToolPage(
  "colour-blindness",
  <ColourBlindnessTool />,
);

export { metadata };
export default Page;
