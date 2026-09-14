import { createToolPage } from "@/components/organisms/tool-page";
import { PngToSvgTool } from "@/components/organisms/tools/png-to-svg/png-to-svg-tool";

const { metadata, Page } = createToolPage("png-to-svg", <PngToSvgTool />);

export { metadata };
export default Page;
