import { createToolPage } from "@/components/tool-page";
import { PdfSplitTool } from "@/components/tools/pdf-split/pdf-split-tool";

const { metadata, Page } = createToolPage("pdf-split", <PdfSplitTool />);

export { metadata };
export default Page;
