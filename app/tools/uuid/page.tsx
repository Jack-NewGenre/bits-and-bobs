import { createToolPage } from "@/components/tool-page";
import { UuidTool } from "@/components/tools/uuid/uuid-tool";

const { metadata, Page } = createToolPage("uuid", <UuidTool />);

export { metadata };
export default Page;
