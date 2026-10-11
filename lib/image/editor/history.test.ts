import { describe, expect, it } from "vitest";

import {
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/image/editor/history";

describe("editor history", () => {
  it("undoes and redoes in order", () => {
    let history = createHistory("a");
    history = pushHistory(history, "b");
    history = pushHistory(history, "c");

    history = undoHistory(history);
    expect(history.present).toBe("b");
    history = undoHistory(history);
    expect(history.present).toBe("a");
    history = redoHistory(history);
    expect(history.present).toBe("b");
    expect(history.future).toEqual(["c"]);
  });

  it("drops the redo stack when a new change is made", () => {
    let history = pushHistory(createHistory("a"), "b");
    history = undoHistory(history);
    history = pushHistory(history, "x");
    expect(history.future).toEqual([]);
    expect(history.past).toEqual(["a"]);
  });

  it("ignores a change that is identical to what is on screen", () => {
    const history = createHistory("a");
    expect(pushHistory(history, "a")).toBe(history);
  });

  it("returns the same history when there is nothing to undo or redo", () => {
    const history = createHistory("a");
    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
  });

  it("forgets the oldest steps past the limit", () => {
    let history = createHistory(0);
    for (let step = 1; step <= 5; step += 1)
      history = pushHistory(history, step, 3);
    expect(history.past).toEqual([2, 3, 4]);
  });
});
