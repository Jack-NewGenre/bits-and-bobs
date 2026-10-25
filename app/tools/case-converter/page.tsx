import { createToolPage } from "@/components/organisms/tool-page";
import { CaseConverterTool } from "@/components/organisms/tools/case-converter/case-converter-tool";

const { metadata, Page } = createToolPage("case-converter", <CaseConverterTool />);

export { metadata };
export default Page;
