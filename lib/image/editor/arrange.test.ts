import { describe, expect, it } from "vitest";

import { arrangeStack } from "@/lib/image/editor/arrange";

describe("arrangeStack", () => {
  const stack = ["A", "B", "C", "D"];

  it("sends several layers to the back without reversing them", () => {
    expect(arrangeStack(stack, new Set(["B", "C", "D"]), "back")).toEqual(["B", "C", "D", "A"]);
    expect(arrangeStack(stack, new Set(stack), "back")).toEqual(stack);
  });

  it("brings several layers to the front in order", () => {
    expect(arrangeStack(stack, new Set(["A", "C"]), "front")).toEqual(["B", "D", "A", "C"]);
  });

  it("moves adjacent layers forward together", () => {
    expect(arrangeStack(stack, new Set(["A", "B"]), "forward")).toEqual(["C", "A", "B", "D"]);
    expect(arrangeStack(stack, new Set(["A", "C"]), "forward")).toEqual(["B", "A", "D", "C"]);
  });

  it("moves adjacent layers backward together", () => {
    expect(arrangeStack(stack, new Set(["C", "D"]), "backward")).toEqual(["A", "C", "D", "B"]);
    expect(arrangeStack(stack, new Set(stack), "backward")).toEqual(stack);
  });

  it("leaves a layer already at the edge where it is", () => {
    expect(arrangeStack(stack, new Set(["D"]), "forward")).toEqual(stack);
    expect(arrangeStack(stack, new Set(["A"]), "backward")).toEqual(stack);
  });
});
