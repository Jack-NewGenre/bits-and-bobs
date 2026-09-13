import { createToolPage } from "@/components/organisms/tool-page";
import { JwtDecoderTool } from "@/components/organisms/tools/jwt-decoder/jwt-decoder-tool";

const { metadata, Page } = createToolPage("jwt-decoder", <JwtDecoderTool />);

export { metadata };
export default Page;
