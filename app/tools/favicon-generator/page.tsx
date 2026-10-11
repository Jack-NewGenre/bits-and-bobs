import { createToolPage } from "@/components/organisms/tool-page";
import { FaviconGeneratorTool } from "@/components/organisms/tools/favicon-generator/favicon-generator-tool";

const { metadata, Page } = createToolPage(
  "favicon-generator",
  <FaviconGeneratorTool />,
);

export { metadata };
export default Page;
