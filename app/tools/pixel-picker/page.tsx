import { createToolPage } from "@/components/organisms/tool-page";
import { PixelPickerTool } from "@/components/organisms/tools/pixel-picker/pixel-picker-tool";

const { metadata, Page } = createToolPage("pixel-picker", <PixelPickerTool />);

export { metadata };
export default Page;
