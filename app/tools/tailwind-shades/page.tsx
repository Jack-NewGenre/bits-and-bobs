import { createToolPage } from "@/components/tool-page";
import { TailwindShadesTool } from "@/components/tools/tailwind-shades/tailwind-shades-tool";

const { metadata, Page } = createToolPage(
  "tailwind-shades",
  <TailwindShadesTool />,
);

export { metadata };
export default Page;
