import { createToolPage } from "@/components/organisms/tool-page";
import { StickerMakerTool } from "@/components/organisms/tools/sticker-maker/sticker-maker-tool";

const { metadata, Page } = createToolPage(
  "sticker-maker",
  <StickerMakerTool />,
);

export { metadata };
export default Page;
