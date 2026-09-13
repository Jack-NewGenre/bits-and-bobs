import { createToolPage } from "@/components/organisms/tool-page";
import { ImagesToPdfTool } from "@/components/organisms/tools/images-to-pdf/images-to-pdf-tool";

const { metadata, Page } = createToolPage("images-to-pdf", <ImagesToPdfTool />);

export { metadata };
export default Page;
