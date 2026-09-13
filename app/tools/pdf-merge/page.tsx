import { createToolPage } from "@/components/tool-page";
import { PdfMergeTool } from "@/components/tools/pdf-merge/pdf-merge-tool";

const { metadata, Page } = createToolPage("pdf-merge", <PdfMergeTool />);

export { metadata };
export default Page;
