import { createToolPage } from "@/components/tool-page";
import { HashGeneratorTool } from "@/components/tools/hash-generator/hash-generator-tool";

const { metadata, Page } = createToolPage(
  "hash-generator",
  <HashGeneratorTool />,
);

export { metadata };
export default Page;
