import { createToolPage } from "@/components/organisms/tool-page";
import { Base64Tool } from "@/components/organisms/tools/base64/base64-tool";

const { metadata, Page } = createToolPage("base64", <Base64Tool />);

export { metadata };
export default Page;
