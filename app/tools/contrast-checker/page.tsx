import { createToolPage } from "@/components/organisms/tool-page";
import { ContrastCheckerTool } from "@/components/organisms/tools/contrast-checker/contrast-checker-tool";

const { metadata, Page } = createToolPage(
  "contrast-checker",
  <ContrastCheckerTool />,
);

export { metadata };
export default Page;
