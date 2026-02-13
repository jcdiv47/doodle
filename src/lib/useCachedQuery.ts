import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

export function useCachedQuery<F extends FunctionReference<"query">>(
  query: F,
  args: FunctionArgs<F> | "skip",
  cacheKey: string,
): FunctionReturnType<F> | undefined {
  const live = useQuery(query, args);

  const [cached] = useState(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    if (live !== undefined) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(live));
      } catch {
        // storage full or unavailable — ignore
      }
    }
  }, [live, cacheKey]);

  return live ?? cached;
}
