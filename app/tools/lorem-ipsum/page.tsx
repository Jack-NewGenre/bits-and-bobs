import { createToolPage } from "@/components/tool-page";
import { LoremIpsumTool } from "@/components/tools/lorem-ipsum/lorem-ipsum-tool";

const { metadata, Page } = createToolPage("lorem-ipsum", <LoremIpsumTool />);

export { metadata };
export default Page;
