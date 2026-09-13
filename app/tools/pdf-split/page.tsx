import { createToolPage } from "@/components/organisms/tool-page";
import { PdfSplitTool } from "@/components/organisms/tools/pdf-split/pdf-split-tool";

const { metadata, Page } = createToolPage("pdf-split", <PdfSplitTool />);

export { metadata };
export default Page;
