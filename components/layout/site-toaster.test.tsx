import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteToaster } from "@/components/layout/site-toaster";

const theme = vi.hoisted(() => ({ resolvedTheme: undefined as string | undefined }));
const toasterProps = vi.hoisted(() => vi.fn());

vi.mock("next-themes", () => ({ useTheme: () => theme }));
vi.mock("@/components/ui/sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    toasterProps(props);
    return null;
  },
}));

describe("SiteToaster", () => {
  beforeEach(() => toasterProps.mockClear());

  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["green", "dark"],
    ["blue", "dark"],
    [undefined, "system"],
  ])("hands Sonner %s as %s", (resolved, expected) => {
    theme.resolvedTheme = resolved;
    render(<SiteToaster />);
    expect(toasterProps).toHaveBeenCalledWith(expect.objectContaining({ theme: expected }));
  });
});
