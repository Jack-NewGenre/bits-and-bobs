import { createToolPage } from "@/components/tool-page";
import { JwtDecoderTool } from "@/components/tools/jwt-decoder/jwt-decoder-tool";

const { metadata, Page } = createToolPage("jwt-decoder", <JwtDecoderTool />);

export { metadata };
export default Page;
