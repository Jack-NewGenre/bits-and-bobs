import { createToolPage } from "@/components/organisms/tool-page";
import { TimestampTool } from "@/components/organisms/tools/timestamp/timestamp-tool";

const { metadata, Page } = createToolPage("timestamp", <TimestampTool />);

export { metadata };
export default Page;
