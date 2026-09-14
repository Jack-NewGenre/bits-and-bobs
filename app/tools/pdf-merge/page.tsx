import { createToolPage } from "@/components/organisms/tool-page";
import { PdfMergeTool } from "@/components/organisms/tools/pdf-merge/pdf-merge-tool";

const { metadata, Page } = createToolPage("pdf-merge", <PdfMergeTool />);

export { metadata };
export default Page;
