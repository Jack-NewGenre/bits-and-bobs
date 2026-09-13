import { createToolPage } from "@/components/tool-page";
import { Base64Tool } from "@/components/tools/base64/base64-tool";

const { metadata, Page } = createToolPage("base64", <Base64Tool />);

export { metadata };
export default Page;
