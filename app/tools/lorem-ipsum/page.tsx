import { createToolPage } from "@/components/organisms/tool-page";
import { LoremIpsumTool } from "@/components/organisms/tools/lorem-ipsum/lorem-ipsum-tool";

const { metadata, Page } = createToolPage("lorem-ipsum", <LoremIpsumTool />);

export { metadata };
export default Page;
