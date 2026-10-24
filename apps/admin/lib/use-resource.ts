import { useCallback, useEffect, useState } from "react";
import { describeError } from "./api";

export type Resource<T> =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

async function settle<T>(load: () => Promise<T>): Promise<Resource<T>> {
  try {
    return { status: "ready", data: await load() };
  } catch (error) {
    return { status: "error", message: describeError(error) };
  }
}

/** Loads data when `load` changes (memoize it with useCallback); `reload` refetches after a mutation. */
export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void settle(load).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const reload = useCallback(async () => {
    setState(await settle(load));
  }, [load]);

  return { state, reload };
}
