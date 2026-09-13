import { createToolPage } from "@/components/tool-page";
import { ContrastCheckerTool } from "@/components/tools/contrast-checker/contrast-checker-tool";

const { metadata, Page } = createToolPage(
  "contrast-checker",
  <ContrastCheckerTool />,
);

export { metadata };
export default Page;
