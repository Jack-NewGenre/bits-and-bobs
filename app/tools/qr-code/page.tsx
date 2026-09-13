import { createToolPage } from "@/components/organisms/tool-page";
import { QrCodeTool } from "@/components/organisms/tools/qr-code/qr-code-tool";

const { metadata, Page } = createToolPage("qr-code", <QrCodeTool />);

export { metadata };
export default Page;
