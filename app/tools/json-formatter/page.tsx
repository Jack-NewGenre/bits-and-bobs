import { createToolPage } from "@/components/tool-page";
import { JsonFormatterTool } from "@/components/tools/json-formatter/json-formatter-tool";

const { metadata, Page } = createToolPage(
  "json-formatter",
  <JsonFormatterTool />,
);

export { metadata };
export default Page;
