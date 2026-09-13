import { createToolPage } from "@/components/tool-page";
import { RegexTesterTool } from "@/components/tools/regex-tester/regex-tester-tool";

const { metadata, Page } = createToolPage("regex-tester", <RegexTesterTool />);

export { metadata };
export default Page;
