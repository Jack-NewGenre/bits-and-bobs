import { createToolPage } from "@/components/organisms/tool-page";
import { BackgroundRemovalTool } from "@/components/organisms/tools/background-removal/background-removal-tool";

const { metadata, Page } = createToolPage(
  "background-removal",
  <BackgroundRemovalTool />,
);

export { metadata };
export default Page;
