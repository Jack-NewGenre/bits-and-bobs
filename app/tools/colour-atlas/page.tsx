import { createToolPage } from "@/components/organisms/tool-page";
import { ColourAtlasTool } from "@/components/organisms/tools/colour-atlas/colour-atlas-tool";

const { metadata, Page } = createToolPage("colour-atlas", <ColourAtlasTool />);

export { metadata };
export default Page;
