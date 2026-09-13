import { createToolPage } from "@/components/organisms/tool-page";
import { JsonFormatterTool } from "@/components/organisms/tools/json-formatter/json-formatter-tool";

const { metadata, Page } = createToolPage(
  "json-formatter",
  <JsonFormatterTool />,
);

export { metadata };
export default Page;
