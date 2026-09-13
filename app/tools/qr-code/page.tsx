import { createToolPage } from "@/components/tool-page";
import { QrCodeTool } from "@/components/tools/qr-code/qr-code-tool";

const { metadata, Page } = createToolPage("qr-code", <QrCodeTool />);

export { metadata };
export default Page;
