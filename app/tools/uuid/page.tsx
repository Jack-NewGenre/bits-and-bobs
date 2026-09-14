import { createToolPage } from "@/components/organisms/tool-page";
import { UuidTool } from "@/components/organisms/tools/uuid/uuid-tool";

const { metadata, Page } = createToolPage("uuid", <UuidTool />);

export { metadata };
export default Page;
