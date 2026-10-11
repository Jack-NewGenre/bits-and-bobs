export type ArrangeDirection = "forward" | "backward" | "front" | "back";

/**
 * The stack (bottom first) after moving the selected items one step or all
 * the way up or down. Selected items move together as a block and keep
 * their order among themselves, the way Photoshop arranges several layers.
 */
export function arrangeStack<T>(
  stack: readonly T[],
  selected: ReadonlySet<T>,
  direction: ArrangeDirection,
): T[] {
  const isSelected = (item: T) => selected.has(item);
  if (direction === "front")
    return [...stack.filter((item) => !isSelected(item)), ...stack.filter(isSelected)];
  if (direction === "back")
    return [...stack.filter(isSelected), ...stack.filter((item) => !isSelected(item))];
  const out = [...stack];
  const swap = (i: number, j: number) => ([out[i], out[j]] = [out[j], out[i]]);
  if (direction === "forward") {
    for (let i = out.length - 2; i >= 0; i -= 1)
      if (isSelected(out[i]) && !isSelected(out[i + 1])) swap(i, i + 1);
  } else {
    for (let i = 1; i < out.length; i += 1)
      if (isSelected(out[i]) && !isSelected(out[i - 1])) swap(i, i - 1);
  }
  return out;
}
