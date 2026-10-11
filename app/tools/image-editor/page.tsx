import { createToolPage } from "@/components/organisms/tool-page";
import { ImageEditorTool } from "@/components/organisms/tools/image-editor/image-editor-tool";

const { metadata, Page } = createToolPage("image-editor", <ImageEditorTool />);

export { metadata };
export default Page;
