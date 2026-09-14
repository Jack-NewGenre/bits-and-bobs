import { createToolPage } from "@/components/organisms/tool-page";
import { PdfToImagesTool } from "@/components/organisms/tools/pdf-to-images/pdf-to-images-tool";

const { metadata, Page } = createToolPage("pdf-to-images", <PdfToImagesTool />);

export { metadata };
export default Page;
