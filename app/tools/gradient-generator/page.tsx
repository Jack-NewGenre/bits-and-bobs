import { createToolPage } from "@/components/organisms/tool-page";
import { GradientGeneratorTool } from "@/components/organisms/tools/gradient-generator/gradient-generator-tool";

const { metadata, Page } = createToolPage(
  "gradient-generator",
  <GradientGeneratorTool />,
);

export { metadata };
export default Page;
