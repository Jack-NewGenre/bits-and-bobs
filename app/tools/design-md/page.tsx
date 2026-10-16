import { createToolPage } from "@/components/organisms/tool-page";
import { DesignMdTool } from "@/components/organisms/tools/design-md/design-md-tool";

const { metadata, Page } = createToolPage("design-md", <DesignMdTool />);

export { metadata };
export default Page;
