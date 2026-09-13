"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

/**
 * Values that can only exist on the client.
 *
 * A generated password, a fresh UUID, the current time: none of these can be
 * rendered on the server, because the server and the browser would produce
 * different HTML and hydration would fail. The page therefore has to render
 * without them first, and fill them in once the browser has taken over.
 */

/** Never fires: whether the client has hydrated only changes once, at mount. */
const noSubscribe = () => () => {};

/**
 * False during server rendering and the hydration pass, true afterwards.
 * Uses `useSyncExternalStore`, which is built for exactly this split, so it
 * needs no effect and triggers no extra render of its own.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/**
 * State seeded once, in the browser, from a non-deterministic source.
 *
 * `serverValue` is what both the server and the hydration pass render, so the
 * two agree. `create` then runs afterwards, deferred past the commit, so the
 * first paint is not held up by a cascading re-render.
 *
 * `create` must be a stable reference, so define it outside the component.
 */
export function useClientSeed<T>(
  create: () => T,
  serverValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(serverValue);

  useEffect(() => {
    queueMicrotask(() => setValue(create()));
  }, [create]);

  return [value, setValue];
}
