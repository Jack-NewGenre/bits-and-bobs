import { createToolPage } from "@/components/tool-page";
import { TimestampTool } from "@/components/tools/timestamp/timestamp-tool";

const { metadata, Page } = createToolPage("timestamp", <TimestampTool />);

export { metadata };
export default Page;
