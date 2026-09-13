import { createToolPage } from "@/components/tool-page";
import { BackgroundRemovalTool } from "@/components/tools/background-removal/background-removal-tool";

const { metadata, Page } = createToolPage(
  "background-removal",
  <BackgroundRemovalTool />,
);

export { metadata };
export default Page;
