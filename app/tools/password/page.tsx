import { createToolPage } from "@/components/tool-page";
import { PasswordTool } from "@/components/tools/password/password-tool";

const { metadata, Page } = createToolPage("password", <PasswordTool />);

export { metadata };
export default Page;
