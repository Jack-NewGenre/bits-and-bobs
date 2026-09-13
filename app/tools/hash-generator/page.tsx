import { createToolPage } from "@/components/organisms/tool-page";
import { HashGeneratorTool } from "@/components/organisms/tools/hash-generator/hash-generator-tool";

const { metadata, Page } = createToolPage(
  "hash-generator",
  <HashGeneratorTool />,
);

export { metadata };
export default Page;
