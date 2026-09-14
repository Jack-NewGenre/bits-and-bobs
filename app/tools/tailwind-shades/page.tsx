import { createToolPage } from "@/components/organisms/tool-page";
import { TailwindShadesTool } from "@/components/organisms/tools/tailwind-shades/tailwind-shades-tool";

const { metadata, Page } = createToolPage(
  "tailwind-shades",
  <TailwindShadesTool />,
);

export { metadata };
export default Page;
