import { createToolPage } from "@/components/organisms/tool-page";
import { RegexTesterTool } from "@/components/organisms/tools/regex-tester/regex-tester-tool";

const { metadata, Page } = createToolPage("regex-tester", <RegexTesterTool />);

export { metadata };
export default Page;
