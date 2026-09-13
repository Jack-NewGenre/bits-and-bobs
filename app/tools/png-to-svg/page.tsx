import { createToolPage } from "@/components/tool-page";
import { PngToSvgTool } from "@/components/tools/png-to-svg/png-to-svg-tool";

const { metadata, Page } = createToolPage("png-to-svg", <PngToSvgTool />);

export { metadata };
export default Page;
