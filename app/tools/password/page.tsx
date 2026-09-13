import { createToolPage } from "@/components/organisms/tool-page";
import { PasswordTool } from "@/components/organisms/tools/password/password-tool";

const { metadata, Page } = createToolPage("password", <PasswordTool />);

export { metadata };
export default Page;
